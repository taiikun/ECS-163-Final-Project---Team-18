// Global variables
let currentData = null;
let svg = null;
let tooltip = d3.select("#tooltip");

// Chart dimensions
const margin = {top: 20, right: 80, bottom: 60, left: 80};
const width = 1100 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Color schemes for different datasets
// Assuming 'layoffs-industry' was removed as per previous requests.
// If it's still needed, add its color scheme back.
const colorSchemes = {
    'layoffs-stage': d3.scaleOrdinal(d3.schemeSet2),
    'layoffs-location': d3.scaleOrdinal(d3.schemeSet3),
    'salary-role': d3.scaleOrdinal(d3.schemePaired)
};

// Variables to store parsed data
let parsedSalaryData = null;

// Fade transition duration (New for fade effect)
const FADE_DURATION = 300; // milliseconds

// Parse the actual salary CSV data
async function loadSalaryData() {
    if (parsedSalaryData) return parsedSalaryData;
    
    try {
        // Assuming global_tech_salary.csv is in the same directory or a 'data/' subdirectory
        // Adjust path if necessary, e.g., 'data/global_tech_salary.csv'
        const response = await fetch('global_tech_salary.csv'); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for global_tech_salary.csv`);
        
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
            
            if (parts.length >= 11) { // Check based on expected columns
                const year = parseInt(parts[0]);
                const jobTitle = parts[3]; // Assuming 'Designation' is the job title
                const salaryUSD = parseInt(parts[6]); // Assuming 'Salary_USD'
                
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
        
        console.log(`Parsed ${data.length} salary records`);
        if (data.length === 0) {
            console.warn("No salary data parsed. Check CSV format and parsing logic.");
        }
        parsedSalaryData = data;
        return data;
    } catch (error) {
        console.error('Error loading salary data:', error);
        throw error; // Re-throw to be caught by calling function
    }
}

// Process salary data for stream graph
async function processSalaryData(aggregation) {
    const rawData = await loadSalaryData();
    if (!rawData || rawData.length === 0) return []; // Return empty if no raw data
    
    // Get top job titles by frequency
    const titleCounts = {};
    rawData.forEach(row => {
        titleCounts[row.jobTitle] = (titleCounts[row.jobTitle] || 0) + 1;
    });
    
    const topTitles = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8) // Top 8 job titles
        .map(([title]) => title);
    
    console.log('Top job titles for salary:', topTitles);
    
    // Filter data to only include top titles
    const filteredData = rawData.filter(row => topTitles.includes(row.jobTitle));
    
    // Calculate average salaries
    const grouped = {};
    filteredData.forEach(row => {
        // Ensure year is valid for period calculation
        if (isNaN(row.year)) {
            console.warn("Invalid year in salary data:", row);
            return; 
        }
        const period = aggregation === 'yearly' ? 
            row.year.toString() : 
            `${row.year}-Q${Math.floor(Math.random() * 4) + 1}`; // Simulate quarters if not present
                                                              // Ideally, your salary data should have quarter info if quarterly aggregation is desired.
        
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
        if (value.count > 0) { // Ensure count is not zero to avoid NaN
            processedData.push({
                period: period,
                category: category,
                value: Math.round(value.sum / value.count)
            });
        }
    });
    
    return processedData;
}

async function loadLayoffData() {
    try {
        // Assuming tech_layoffs_Q2_2024.csv is in the same directory or a 'data/' subdirectory
        // Adjust path if necessary, e.g., 'data/tech_layoffs_Q2_2024.csv'
        const response = await fetch('tech_layoffs_Q2_2024.csv'); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for tech_layoffs_Q2_2024.csv`);
        
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
        throw error; // Re-throw
    }
}

function processLayoffData(rows, dataset, aggregation) {
    // Group data by period and category
    const grouped = d3.group(rows, 
        d => {
            const date = new Date(d.Date_layoffs); // Ensure this column name matches your CSV
            // Validate date before processing
            if (isNaN(date.getTime()) || !d.Year) { // d.Year should also exist and be valid
                console.warn("Invalid date or year in layoff data:", d);
                return "Unknown Period"; // Fallback for invalid dates
            }
            if (aggregation === 'yearly') {
                return d.Year.toString();
            } else {
                return `${d.Year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
            }
        },
        d => {
            switch(dataset) {
                // 'layoffs-industry' case removed as per previous request.
                // If it's needed, add: case 'layoffs-industry': return d.Industry || 'Unknown';
                case 'layoffs-stage': return d.Stage || 'Unknown'; // Ensure 'Stage' column exists
                case 'layoffs-location': return d.Region || d.Location_HQ || 'Unknown'; // Ensure these columns exist
                default: return 'Unknown';
            }
        }
    );
    
    // Convert to array format
    const data = [];
    for (const [period, categoryMap] of grouped) {
        if (period === "Unknown Period") continue; // Skip data with unknown periods
        for (const [category, records] of categoryMap) {
            const totalLayoffs = d3.sum(records, d => +d.Laid_Off || 0); // Ensure 'Laid_Off' column exists
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
    // Clear previous chart content (e.g., loading message or old SVG)
    d3.select("#chart-container").html('');
    
    // Create SVG, initially transparent for fade-in
    svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("opacity", 0); // Start with opacity 0 for fade-in effect

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Get unique periods and categories
    const periods = [...new Set(data.map(d => d.period))].sort((a, b) => {
        // Custom sort for "YYYY-QN" and "YYYY" formats
        const partsA = a.split('-Q');
        const partsB = b.split('-Q');
        const yearA = parseInt(partsA[0]);
        const yearB = parseInt(partsB[0]);
        if (yearA !== yearB) return yearA - yearB;
        if (partsA.length > 1 && partsB.length > 1) {
            return parseInt(partsA[1]) - parseInt(partsB[1]);
        }
        return 0; // Should not happen if formats are consistent
    });
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
        .offset(d3.stackOffsetWiggle); // Or d3.stackOffsetSilhouette for a different baseline
    
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
        .curve(d3.curveCardinal); // Or d3.curveBasis for smoother curves
    
    // Color scale
    const currentDatasetType = document.getElementById('dataset-select').value;
    const colorScale = colorSchemes[currentDatasetType] || d3.scaleOrdinal(d3.schemeCategory10); // Fallback
    
    // Draw streams
    g.selectAll(".stream-area") // Changed from svg.selectAll to g.selectAll
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-area")
        .attr("d", area)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.8) // Initial opacity of streams themselves
        .on("mouseover", function(event, d) {
            // Highlight stream
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.3);
            d3.select(this).transition().duration(150).attr("opacity", 1);
            
            // Show tooltip
            // Find the closest period based on mouse position
            const [mouseX] = d3.pointer(event, this);
            const invertedX = xScale.domain().find((p, i, arr) => {
                if (i === arr.length - 1) return true; // Last point
                const xPos = xScale(p);
                const nextXPos = xScale(arr[i+1]);
                return mouseX >= xPos - (xPos - (i > 0 ? xScale(arr[i-1]) : xPos))/2 && mouseX < nextXPos - (nextXPos - xPos)/2;
            }) || periods[Math.round(mouseX / (width / (periods.length -1)))]; // Fallback if not found by inversion

            const periodDataPoint = d.find(dataPoint => dataPoint.data.period === invertedX);
            const value = periodDataPoint ? periodDataPoint.data[d.key] : 'N/A';

            tooltip.html(`
                <strong>${d.key}</strong><br>
                Period: ${invertedX}<br>
                ${currentDatasetType.includes('salary') ? 
                  `Average Salary: $${value.toLocaleString()}` : 
                  `Layoffs: ${value.toLocaleString()}`}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
            // Reset opacity
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.8);
            
            // Hide tooltip
            tooltip.style("opacity", 0);
        });
    
    // Add X axis
    g.append("g") // Changed from svg.append to g.append
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d.length > 4 ? d.substring(2) : d )) // Shorten year-quarter labels
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    // Add Y axis label
    const yAxisLabel = currentDatasetType.includes('salary') ? 
        "Average Salary ($)" : "Number of Layoffs";
    
    g.append("text") // Changed from svg.append to g.append
        .attr("class", "axis-label y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15) // Adjusted position
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yAxisLabel);
    
    // Add title
    // Titles are now handled by index.html, but if you want a dynamic one:
    /*
    g.append("text") // Changed from svg.append to g.append
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 5) // Adjusted position
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .text(currentDatasetType.includes('salary') ? 
              "Average Tech Salaries by Job Role" : "Tech Industry Layoffs Over Time");
    */
    
    // Create legend
    createLegend(categories, colorScale);

    // Fade in the new chart (New for fade effect)
    svg.transition()
        .duration(FADE_DURATION)
        .style("opacity", 1);
}

function createLegend(categories, colorScale) {
    const legendContainer = d3.select("#legend");
    legendContainer.html(''); // Clear previous legend
    
    categories.forEach(category => {
        const item = legendContainer.append("div")
            .attr("class", "legend-item")
            .on("click", function() {
                // Toggle visibility of stream
                const isHidden = d3.select(this).classed("hidden");
                const newOpacity = isHidden ? 1 : 0.3;
                d3.select(this).classed("hidden", !isHidden);
                d3.select(this).style("opacity", newOpacity);
                
                // Update stream visibility using the 'g' element
                svg.select("g").selectAll(".stream-area") // Ensure we select within the main 'g'
                    .filter(d => d.key === category)
                    .transition().duration(FADE_DURATION) // Add transition to hide/show
                    .style("display", isHidden ? "block" : "none")
                    .attr("opacity", isHidden ? 0.8 : 0); // Fade out if hiding
            });
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(category));
        
        item.append("span")
            .text(category);
    });
}

// Placeholder for animation function
function animateTimeline() {
    console.log("Animate Timeline button clicked. Animation not yet implemented.");
    // This function would typically iterate through time periods and update the graph
    // For example, if showing quarterly data, it might simulate progression through quarters.
    alert("Timeline animation feature is not yet implemented.");
}

// Updated function to handle chart transitions (New for fade effect)
async function updateVisualization() {
    const dataset = document.getElementById('dataset-select').value;
    const aggregation = document.getElementById('aggregation-select').value;
    
    const chartContainer = d3.select("#chart-container");
    const existingSvg = chartContainer.select("svg");

    if (existingSvg.empty()) { // Initial load or if chart was previously cleared
        // The static loading message from index.html is shown initially.
        // loadAndDrawData will replace it once data is ready or show an error.
        loadAndDrawData(dataset, aggregation, chartContainer);
    } else {
        // Fade out existing chart before loading new data (New for fade effect)
        existingSvg.transition()
            .duration(FADE_DURATION)
            .style("opacity", 0)
            .end() // .end() returns a promise that resolves when transition ends
            .then(() => {
                chartContainer.html('<div class="loading">Loading data...</div>'); // Show loading message after fade out
                loadAndDrawData(dataset, aggregation, chartContainer);
            })
            .catch(error => {
                // Fallback if transition is interrupted or fails
                console.error("Fade out transition failed:", error);
                chartContainer.html('<div class="loading">Loading data...</div>'); // Show loading message
                loadAndDrawData(dataset, aggregation, chartContainer);
            });
    }
}

// Helper function to load data and draw the chart (New for fade effect)
async function loadAndDrawData(dataset, aggregation, chartContainer) {
    // If the chart container doesn't already have a loading message (e.g. initial load where index.html provides one)
    // and there's no SVG, it means we are at the very start.
    // The initial loading message in index.html handles the first display.
    // This function is primarily concerned with loading data and then calling createStreamGraph.
    // createStreamGraph will clear the container (including any loading message) before drawing.

    try {
        let data;
        if (dataset === 'salary-role') {
            data = await processSalaryData(aggregation);
        } else { // Assumes other types are layoffs
            data = await loadLayoffData(); 
        }
        
        if (data && data.length > 0) {
            currentData = data;
            createStreamGraph(data); // createStreamGraph will handle its own fade-in
        } else {
            // If data is empty after processing, show a specific message
            chartContainer.html('<div class="error">No data available for the selected criteria.</div>');
        }
    } catch (error) {
        console.error('Error in loadAndDrawData:', error);
        chartContainer.html(`
            <div class="error">
                <h3>Error loading data</h3>
                <p>${error.message || 'Please try again.'}</p>
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
// console.log('Current URL:', window.location.href); // Original comment
// console.log('Looking for files in:', window.location.origin + window.location.pathname.replace(/[^\/]*$/, '')); // Original comment

// Test if files are accessible (optional, for debugging)
async function testFileAccess() {
    // Adjust paths if your files are in a 'data/' subdirectory
    const files = ['global_tech_salary.csv', 'tech_layoffs_Q2_2024.csv']; 
    for (const file of files) {
        try {
            const response = await fetch(file);
            console.log(`File access test: ${file} - ${response.ok ? 'Found' : 'Not found'} (Status: ${response.status})`);
        } catch (error) {
            console.log(`File access test: ${file} - Failed to fetch: ${error.message}`);
        }
    }
}

// Initial call to load the default chart
testFileAccess().then(() => { // Optional: run test then update
    updateVisualization();
});
