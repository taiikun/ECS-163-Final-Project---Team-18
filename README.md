# Tech Industry Interactive Visualizations (2020-2024)

## Description

This repository contains an interactive data visualization dashboard that tells the story of one of the most dramatic transformations in recent tech industry history. Between 2020 and 2024, the technology sector experienced unprecedented changes—from explosive growth and salary increases during the pandemic boom to widespread layoffs and market corrections that followed. This project captures that entire journey through a comprehensive visual narrative that combines storytelling with deep data exploration.

The dashboard employs a sophisticated "martini glass" design pattern that guides users through a carefully crafted narrative before opening up to full interactivity. The experience begins with a six-step guided story that reveals key insights about the tech transformation: how salaries evolved across different roles, which geographic regions bore the brunt of layoffs, what companies led the wave of workforce reductions, and how the job market recovered from initial pandemic disruptions. Each story section automatically loads relevant visualizations as users scroll or navigate, creating an engaging and educational experience that makes complex data accessible to a broad audience.

Built entirely with modern web technologies including D3.js, HTML5, CSS3, and vanilla JavaScript, the project demonstrates advanced data visualization techniques across multiple chart types. The implementation features stream graphs for salary evolution trends, interactive choropleth maps for geographic analysis, animated bar charts for company comparisons, line charts tracking job market fluctuations, and donut charts showing the evolution of remote work adoption. The  JavaScript architecture ensures maintainability while providing smooth animations and responsive interactions across all visualizations.

The data tells a compelling story of an industry in flux. Tech salaries climbed steadily through the period as companies competed for talent, but this growth came with significant costs. The visualization reveals how layoffs concentrated heavily in major tech hubs: the Bay Area saw over 150,000 job cuts, while Seattle and New York City experienced tens of thousands more. Major companies like Amazon, Meta, Microsoft, and Google led these workforce reductions, fundamentally reshaping the employment landscape. The dashboard also captures the post-pandemic hiring boom that peaked in 2022 before declining sharply, along with the ongoing evolution of work styles as remote and hybrid arrangements became more prevalent across the industry.

## Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server to serve the files (required due to CORS restrictions when loading CSV data)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone [your-repository-url]
   cd [repository-name]
2. **Start a local web server**
- Install the Live Server extension in VS Code
- Open the project folder in VS Code
- Right-click on index.html and select "Open with Live Server"

## Execution

### Running the Demo

1. **Start the application**
  - As the live server opens, the dashboard should load automatically with the title screen. 

2. **Experience the narrative section**
  - **Scroll down** or **click the navigation dots** on the right side to progress through the six-step story
  - Each section will automatically load its corresponding visualization:
    - Step 1: Introduction and hook
    - Step 2: Tech salary trends stream graph
    - Step 3: Geographic layoff distribution map
    - Step 4: Top companies by layoffs bar chart
    - Step 5: Job market recovery line chart
    - Step 6: Work style distribution donut chart

3. **Explore the interactive section**
  - Continue scrolling to reach the interactive exploration area
  - **Tech Salary Evolution**: Toggle between quarterly/yearly views and click "Animate Timeline"
  - **Company Layoff Analysis**: Click year buttons (2020-2024) to filter data
  - **Geographic Impact Analysis**: Use year buttons to see location-based trends
  - **Job Market Tracker**: Hover over data points for detailed monthly statistics
  - **Work Style Distribution**: Explore the remote vs hybrid vs onsite breakdown
  - **Interactive Map**: Hover over circles to see regional layoff details

4. **Navigation tips**
  - Use mouse hover on all chart elements for detailed tooltips
  - Year filter buttons are interactive across multiple charts
  - The narrative dots allow quick jumping between story sections
  - All visualizations are responsive and will adapt to different screen sizes