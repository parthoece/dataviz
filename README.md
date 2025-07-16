# Data Visualization Dashboards

This repository contains multiple interactive data visualization dashboards created using **HTML**, **CSS**, **JavaScript (D3.js)**, and **CSV data**. Each folder corresponds to an individual project or homework assignment. Dashboards are hosted live via **GitHub Pages** and automatically updated using **GitHub Actions (CI/CD)**.

---

## Live Dashboards

| Project | Link |
|--------|------|
|  **Data Viz Project V1** | [View Dashboard](https://parthoece.github.io/dataviz/data_viz_project_v1/) |
| HW1 - Scatter Plot        | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw1/) |
| HW2                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw2/) |
| HW3                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw3/) |
| HW4                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw4/) |
| HW5                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw5/) |
| HW6                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw6/) |
| HW7                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw7/) |
| HW8                      | [View Dashboard](https://parthoece.github.io/dataviz/312540006_hw8/) |
| Original Data Viz Project | [View Dashboard](https://parthoece.github.io/dataviz/data_viz_project/) |

 A landing page with links to all dashboards is also hosted at:  
  [https://parthoece.github.io/dataviz/](https://parthoece.github.io/dataviz/)

---

## CI/CD with GitHub Actions

Every time a new folder or dashboard is pushed to the `main` branch:

1. **GitHub Actions** automatically:
   - Scans each dashboard folder (e.g., `312540006_hw*`, `data_viz_project*`)
   - Renames the main HTML file (e.g., `312540006.html`) to `index.html` so GitHub Pages can render it
   - Rebuilds the main landing page (`index.html`) with links to all dashboards
   - Publishes the entire site using GitHub Pages

2. No manual deployment is needed.  
   The workflow is defined in `.github/workflows/deploy.yml`.

---

##  Notes on CSV Data

- Dashboards using `d3.csv("iris.csv")` **may not work directly** on GitHub Pages due to **CORS restrictions**.
- Solution:
  - Convert CSV to embedded JSON in JS **(recommended)**  
  - Or use a **raw GitHub URL** to load CSV:
    ```js
    d3.csv("https://raw.githubusercontent.com/parthoece/dataviz/main/312540006_hw1/iris.csv")
    ```

---

##  Author

**Partho Adhikari**  
ID: `312540006`  
Created as part of the Data Visualization coursework.

---

##  Folder Structure

```
 312540006_hw1/            → HW1 dashboard (scatter plot)
 312540006_hw2/            → HW2 dashboard
 data_viz_project/         → Final visualization project
 data_viz_project_v1/      → Improved version of the final project
.github/workflows/deploy.yml → CI/CD workflow for auto-deploy
index.html                  → Landing page linking all dashboards
```

---

##  Contributions

This repo is academic and for demonstration purposes. For issues or feedback, feel free to open an [Issue](https://github.com/parthoece/dataviz/issues).
