let currentData = null;
let svg = null;
let tooltip = d3.select("#tooltip");

const margin = {top: 20, right: 80, bottom: 60, left: 80};
const width = 1100 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const colorScheme = d3.scaleOrdinal(d3.schemePaired);

let parsedSalaryData = null;
const FADE_DURATION = 300;

async function loadSalaryData() {
    if (parsedSalaryData) return parsedSalaryData;
    
    const response = await fetch('global_tech_salary.csv'); 
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.replace(/^"|"$/g, '');
        const parts = cleanLine.split(',').map(p => p.replace(/^"|"$/g, '').trim());
        
        if (parts.length >= 11) {
            const year = parseInt(parts[0]);
            const jobTitle = parts[3];
            const salaryUSD = parseInt(parts[6]);
            
            if (year && jobTitle && !isNaN(salaryUSD)) {
                data.push({
                    year: year,
                    jobTitle: jobTitle,
                    salary: salaryUSD,
                    experienceLevel: parts[1],
                    employmentType: parts[2],
                    remoteRatio: parseInt(parts[8]) || 0
                });
            }
        }
    }
    
    parsedSalaryData = data;
    return data;
}

async function processSalaryData(aggregation) {
    const rawData = await loadSalaryData();
    if (!rawData || rawData.length === 0) return [];
    
    const titleCounts = {};
    rawData.forEach(row => {
        titleCounts[row.jobTitle] = (titleCounts[row.jobTitle] || 0) + 1;
    });
    
    const topTitles = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([title]) => title);

    const filteredData = rawData.filter(row => topTitles.includes(row.jobTitle));
    
    const grouped = {};
    filteredData.forEach(row => {
        if (isNaN(row.year)) return; 
        const period = aggregation === 'yearly' ? 
            row.year.toString() : 
            `${row.year}-Q${Math.floor(Math.random() * 4) + 1}`;
        
        const key = `${period}|${row.jobTitle}`;
        if (!grouped[key]) {
            grouped[key] = { sum: 0, count: 0 };
        }
        grouped[key].sum += row.salary;
        grouped[key].count += 1;
    });
    
    const processedData = [];
    Object.entries(grouped).forEach(([key, value]) => {
        const [period, category] = key.split('|');
        if (value.count > 0) {
            processedData.push({
                period: period,
                category: category,
                value: Math.round(value.sum / value.count)
            });
        }
    });
    
    return processedData;
}

function createStreamGraph(data) {
    d3.select("#chart-container").html('');
    
    svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("opacity", 0);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const periods = [...new Set(data.map(d => d.period))].sort((a, b) => {
        const partsA = a.split('-Q');
        const partsB = b.split('-Q');
        const yearA = parseInt(partsA[0]);
        const yearB = parseInt(partsB[0]);
        if (yearA !== yearB) return yearA - yearB;
        if (partsA.length > 1 && partsB.length > 1) {
            return parseInt(partsA[1]) - parseInt(partsB[1]);
        }
        return 0; 
    });
    const categories = [...new Set(data.map(d => d.category))];
    
    const stackData = periods.map(period => {
        const periodData = {period: period};
        categories.forEach(cat => {
            const record = data.find(d => d.period === period && d.category === cat);
            periodData[cat] = record ? record.value : 0;
        });
        return periodData;
    });
    
    const stack = d3.stack()
        .keys(categories)
        .offset(d3.stackOffsetWiggle);
    
    const series = stack(stackData);
    
    const xScale = d3.scalePoint()
        .domain(periods)
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);
    
    const area = d3.area()
        .x(d => xScale(d.data.period))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveCardinal);
    
    g.selectAll(".stream-area") 
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-area")
        .attr("d", area)
        .attr("fill", d => colorScheme(d.key))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.3);
            d3.select(this).transition().duration(150).attr("opacity", 1);
            tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const [mouseX] = d3.pointer(event, this);
            const invertedX = xScale.domain().find((p, i, arr) => {
                if (i === arr.length - 1) return true;
                const xPos = xScale(p);
                const nextXPos = xScale(arr[i+1]);
                return mouseX >= xPos - (xPos - (i > 0 ? xScale(arr[i-1]) : xPos))/2 && mouseX < nextXPos - (nextXPos - xPos)/2;
            }) || periods[Math.round(mouseX / (width / (periods.length -1)))];

            const periodDataPoint = d.find(dataPoint => dataPoint.data.period === invertedX);
            const value = periodDataPoint ? periodDataPoint.data[d.key] : 'N/A';

            tooltip.html(`
                <strong>${d.key}</strong><br>
                Period: ${invertedX}<br>
                Average Salary: $${value.toLocaleString()}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.8);
            tooltip.style("opacity", 0);
        });
    
    g.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d.length > 4 ? d.substring(2) : d ))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    g.append("text")
        .attr("class", "axis-label y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Average Salary ($)");
    
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 5)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .text("Average Tech Salaries by Job Role");

    createLegend(categories, colorScheme);

    svg.transition()
        .duration(FADE_DURATION)
        .style("opacity", 1);
}

function createLegend(categories, colorScale) {
    const legendContainer = d3.select("#legend");
    legendContainer.html('');
    
    categories.forEach(category => {
        const item = legendContainer.append("div")
            .attr("class", "legend-item")
            .on("click", function() {
                const isHidden = d3.select(this).classed("hidden");
                const newOpacity = isHidden ? 1 : 0.3;
                d3.select(this).classed("hidden", !isHidden);
                d3.select(this).style("opacity", newOpacity);
                
                svg.select("g").selectAll(".stream-area") 
                    .filter(d => d.key === category)
                    .transition().duration(FADE_DURATION)
                    .style("display", isHidden ? "block" : "none")
                    .attr("opacity", isHidden ? 0.8 : 0);
            });
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(category));
        
        item.append("span")
            .text(category);
    });
}

// Global animation state
let currentAnimation = 1;

function animateTimeline() {
    if (!svg) return;

    currentAnimation = (currentAnimation * 1);
    
    // Clear any existing animations
    svg.selectAll(".stream-area").interrupt();
    svg.selectAll(".axis").interrupt();
    
    switch(currentAnimation) {
        case 1:
            animateByCategory();
            break;
    }
}

// Animation: Reveal by category (staggered)
function animateByCategory() {
    const paths = svg.selectAll(".stream-area");
    
    paths.attr("opacity", 0)
        .transition()
        .delay((d, i) => i * 300)
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("opacity", 0.8);
    
    // Fade in axis
    animateAxis();
}

// Helper function to animate axis
function animateAxis() {
    svg.selectAll(".axis text")
        .style("opacity", 0)
        .transition()
        .delay((d, i) => i * 100)
        .duration(500)
        .style("opacity", 1);
    
    svg.selectAll(".axis-label, .chart-title")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);
}

async function updateVisualization() {
    const aggregation = document.getElementById('aggregation-select').value;
    
    const chartContainer = d3.select("#chart-container");
    const existingSvg = chartContainer.select("svg");

    if (existingSvg.empty()) {
        loadAndDrawData(aggregation, chartContainer);
    } else {
        existingSvg.transition()
            .duration(FADE_DURATION)
            .style("opacity", 0)
            .end() 
            .then(() => {
                chartContainer.html('<div class="loading">Loading data...</div>');
                loadAndDrawData(aggregation, chartContainer);
            })
            .catch(() => {
                chartContainer.html('<div class="loading">Loading data...</div>');
                loadAndDrawData(aggregation, chartContainer);
            });
    }
}

async function loadAndDrawData(aggregation, chartContainer) {
    const data = await processSalaryData(aggregation);
    
    if (data && data.length > 0) {
        currentData = data;
        createStreamGraph(data);
    } else {
        chartContainer.html('<div class="error">No data available for the selected criteria.</div>');
    }
}

document.getElementById('aggregation-select').addEventListener('change', updateVisualization);
document.getElementById('animate-btn').addEventListener('click', animateTimeline);

async function testFileAccess() {
    const response = await fetch('global_tech_salary.csv');
}

testFileAccess().then(() => {
    updateVisualization();
});
