// Global variables
let currentData = null;
let svg = null;
let tooltip = d3.select("#tooltip");

// Chart dimensions
const margin = {top: 20, right: 80, bottom: 60, left: 80};
const width = 1100 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Color schemes for different datasets
const colorSchemes = {
    'layoffs-industry': d3.scaleOrdinal(d3.schemeCategory10),
    'layoffs-stage': d3.scaleOrdinal(d3.schemeSet2),
    'layoffs-location': d3.scaleOrdinal(d3.schemeSet3),
    'salary-role': d3.scaleOrdinal(d3.schemePaired)
};

// Variables to store parsed data
let parsedSalaryData = null;

// Parse the actual salary CSV data
async function loadSalaryData() {
    if (parsedSalaryData) return parsedSalaryData;
    
    try {
        const response = await fetch('global_tech_salary.csv');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        console.log('Salary CSV loaded, parsing...');
        
        // Parse the CSV manually due to unusual formatting
        const lines = text.split('\n').filter(line => line.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Remove outer quotes and parse
            const cleanLine = line.replace(/^"|"$/g, '');
            const parts = cleanLine.split(',').map(p => p.replace(/^"|"$/g, '').trim());
            
            if (parts.length >= 11) {
                const year = parseInt(parts[0]);
                const jobTitle = parts[3];
                const salaryUSD = parseInt(parts[6]);
                
                if (year && jobTitle && salaryUSD) {
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
        
        console.log(`Parsed ${data.length} salary records`);
        parsedSalaryData = data;
        return data;
    } catch (error) {
        console.error('Error loading salary data:', error);
        throw error;
    }
}

// Process salary data for stream graph
async function processSalaryData(aggregation) {
    const rawData = await loadSalaryData();
    
    // Get top job titles by frequency
    const titleCounts = {};
    rawData.forEach(row => {
        titleCounts[row.jobTitle] = (titleCounts[row.jobTitle] || 0) + 1;
    });
    
    const topTitles = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8) // Top 8 job titles
        .map(([title]) => title);
    
    console.log('Top job titles:', topTitles);
    
    // Filter data to only include top titles
    const filteredData = rawData.filter(row => topTitles.includes(row.jobTitle));
    
    // Calculate average salaries
    const grouped = {};
    filteredData.forEach(row => {
        const period = aggregation === 'yearly' ? 
            row.year.toString() : 
            `${row.year}-Q${Math.floor(Math.random() * 4) + 1}`; // Simulate quarters
        
        const key = `${period}|${row.jobTitle}`;
        if (!grouped[key]) {
            grouped[key] = { sum: 0, count: 0 };
        }
        grouped[key].sum += row.salary;
        grouped[key].count += 1;
    });
    
    // Convert to array format
    const processedData = [];
    Object.entries(grouped).forEach(([key, value]) => {
        const [period, category] = key.split('|');
        processedData.push({
            period: period,
            category: category,
            value: Math.round(value.sum / value.count)
        });
    });
    
    return processedData;
}

async function loadLayoffData() {
    try {
        const response = await fetch('tech_layoffs_Q2_2024.csv');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        console.log('Layoff CSV loaded, parsing...');
        
        // Parse CSV
        const rows = d3.csvParse(text);
        console.log(`Parsed ${rows.length} layoff records`);
        
        // Process data based on selected dataset
        const dataset = document.getElementById('dataset-select').value;
        const aggregation = document.getElementById('aggregation-select').value;
        
        return processLayoffData(rows, dataset, aggregation);
    } catch (error) {
        console.error('Error loading layoff data:', error);
        throw error;
    }
}

function processLayoffData(rows, dataset, aggregation) {
    // Group data by period and category
    const grouped = d3.group(rows, 
        d => {
            const date = new Date(d.Date_layoffs);
            if (aggregation === 'yearly') {
                return d.Year;
            } else {
                return `${d.Year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
            }
        },
        d => {
            switch(dataset) {
                case 'layoffs-industry': return d.Industry || 'Unknown';
                case 'layoffs-stage': return d.Stage || 'Unknown';
                case 'layoffs-location': return d.Region || d.Location_HQ || 'Unknown';
                default: return 'Unknown';
            }
        }
    );
    
    // Convert to array format
    const data = [];
    for (const [period, categoryMap] of grouped) {
        for (const [category, records] of categoryMap) {
            const totalLayoffs = d3.sum(records, d => +d.Laid_Off || 0);
            if (totalLayoffs > 0) {
                data.push({
                    period: period,
                    category: category,
                    value: totalLayoffs
                });
            }
        }
    }
    
    return data;
}

function createStreamGraph(data) {
    // Clear previous chart
    d3.select("#chart-container").html('');
    
    // Create SVG
    svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Get unique periods and categories
    const periods = [...new Set(data.map(d => d.period))].sort();
    const categories = [...new Set(data.map(d => d.category))];
    
    // Prepare data for stack
    const stackData = periods.map(period => {
        const periodData = {period: period};
        categories.forEach(cat => {
            const record = data.find(d => d.period === period && d.category === cat);
            periodData[cat] = record ? record.value : 0;
        });
        return periodData;
    });
    
    // Create stack
    const stack = d3.stack()
        .keys(categories)
        .offset(d3.stackOffsetWiggle);
    
    const series = stack(stackData);
    
    // Scales
    const xScale = d3.scalePoint()
        .domain(periods)
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);
    
    // Area generator
    const area = d3.area()
        .x(d => xScale(d.data.period))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveCardinal);
    
    // Color scale
    const colorScale = colorSchemes[document.getElementById('dataset-select').value];
    
    // Draw streams
    const streams = svg.selectAll(".stream-area")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-area")
        .attr("d", area)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            // Highlight stream
            d3.selectAll(".stream-area").attr("opacity", 0.3);
            d3.select(this).attr("opacity", 1);
            
            // Show tooltip
            const [x, y] = d3.pointer(event, this);
            const periodIndex = Math.round(x / (width / (periods.length - 1)));
            const period = periods[Math.max(0, Math.min(periodIndex, periods.length - 1))];
            const value = d[periodIndex] ? d[periodIndex].data[d.key] : 0;
            
            tooltip.html(`
                <strong>${d.key}</strong><br>
                Period: ${period}<br>
                ${document.getElementById('dataset-select').value.includes('salary') ? 
                  `Average Salary: $${value.toLocaleString()}` : 
                  `Layoffs: ${value.toLocaleString()}`}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
            // Reset opacity
            d3.selectAll(".stream-area").attr("opacity", 0.8);
            
            // Hide tooltip
            tooltip.style("opacity", 0);
        });
    
    // Add X axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    
    // Add Y axis label
    const yAxisLabel = document.getElementById('dataset-select').value.includes('salary') ? 
        "Average Salary ($)" : "Number of Layoffs";
    
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yAxisLabel);
    
    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .text(document.getElementById('dataset-select').value.includes('salary') ? 
              "Average Tech Salaries by Job Role" : "Tech Industry Layoffs Over Time");
    
    // Create legend
    createLegend(categories, colorScale);
}

function createLegend(categories, colorScale) {
    const legend = d3.select("#legend");
    legend.html('');
    
    categories.forEach(category => {
        const item = legend.append("div")
            .attr("class", "legend-item")
            .on("click", function() {
                // Toggle visibility of stream
                const isHidden = d3.select(this).classed("hidden");
                d3.select(this).classed("hidden", !isHidden);
                d3.select(this).style("opacity", isHidden ? 1 : 0.3);
                
                // Update stream visibility
                svg.selectAll(".stream-area")
                    .filter(d => d.key === category)
                    .style("display", isHidden ? "block" : "none");
            });
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(category));
        
        item.append("span")
            .text(category);
    });
}

function animateTimeline() {
    if (!svg) return;
    
    const paths = svg.selectAll(".stream-area");
    const totalLength = paths.node().getTotalLength();
    
    paths
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(3000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
}

async function updateVisualization() {
    const dataset = document.getElementById('dataset-select').value;
    const aggregation = document.getElementById('aggregation-select').value;
    
    try {
        // Show loading message
        d3.select("#chart-container").html('<div class="loading">Loading data...</div>');
        
        let data;
        if (dataset === 'salary-role') {
            data = await processSalaryData(aggregation);
        } else {
            data = await loadLayoffData();
        }
        
        if (data && data.length > 0) {
            currentData = data;
            createStreamGraph(data);
        } else {
            throw new Error('No data available');
        }
    } catch (error) {
        console.error('Error in updateVisualization:', error);
        d3.select("#chart-container").html(`
            <div class="error">
                <h3>Error loading data</h3>
            </div>
        `);
    }
}

// Event listeners
document.getElementById('dataset-select').addEventListener('change', updateVisualization);
document.getElementById('aggregation-select').addEventListener('change', updateVisualization);
document.getElementById('animate-btn').addEventListener('click', animateTimeline);

// Initial load
console.log('Starting visualization...');
console.log('Current URL:', window.location.href);
console.log('Looking for files in:', window.location.origin + window.location.pathname.replace(/[^\/]*$/, ''));

// Test if files are accessible
async function testFileAccess() {
    const files = ['global_tech_salary.csv', 'tech_layoffs_Q2_2024.csv'];
    for (const file of files) {
        try {
            const response = await fetch(file);
            console.log(`✓ ${file}: ${response.ok ? 'Found' : 'Not found'} (${response.status})`);
        } catch (error) {
            console.log(`✗ ${file}: Failed to fetch - ${error.message}`);
        }
    }
}

testFileAccess().then(() => {
    updateVisualization();
});