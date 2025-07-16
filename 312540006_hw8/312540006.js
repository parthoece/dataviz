// Define the custom D3 Sankey function
d3.sankey = function () {
    var sankey = {}, // Main object to hold the Sankey layout functions and variables
        nodeWidth = 24, // Default width of the nodes
        nodePadding = 8, // Default padding between nodes
        size = [1, 1], // Default size of the diagram (width, height)
        nodes = [], // Array to hold node data
        links = [], // Array to hold link data
        attributeOrder = []; // Order in which attributes are processed

    // Function to set or get the node width
    sankey.nodeWidth = function (_) {
        if (!arguments.length) return nodeWidth;
        nodeWidth = +_; // Update node width
        return sankey;
    };

    // Function to set or get the node padding
    sankey.nodePadding = function (_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_; // Update node padding
        return sankey;
    };

    // Function to set or get the nodes
    sankey.nodes = function (_) {
        if (!arguments.length) return nodes;
        nodes = _; // Set nodes array
        return sankey;
    };

    // Function to set or get the links
    sankey.links = function (_) {
        if (!arguments.length) return links;
        links = _; // Set links array
        return sankey;
    };

    // Function to set or get the size of the diagram
    sankey.size = function (_) {
        if (!arguments.length) return size;
        size = _; // Update size
        return sankey;
    };

    // Function to layout the diagram
    sankey.layout = function (iterations) {
        computeNodeLinks(); // Compute source and target links for each node
        computeNodeValues(); // Compute value of each node
        computeNodeBreadths(); // Position nodes horizontally based on attribute order
        computeNodeDepths(iterations); // Position nodes vertically
        computeLinkDepths(); // Compute link paths
        computeColorID(); // Assign color ID for nodes
        return sankey;
    };

    // Function to recompute link depths after changes
    sankey.relayout = function () {
        computeLinkDepths(); // Update link paths
        return sankey;
    };

    // Function to create a link path
    sankey.link = function () {
        var curvature = 0.5; // Curvature factor for link paths

        function link(d) {
            // Create path for a link between nodes
            var x0 = d.source.x + d.source.dx, // Starting x-coordinate
                x1 = d.target.x, // Ending x-coordinate
                xi = d3.interpolateNumber(x0, x1), // Interpolation function for curvature
                x2 = xi(curvature), // Control point 1
                x3 = xi(1 - curvature), // Control point 2
                y0 = d.source.y + d.sy + d.dy / 2, // Starting y-coordinate
                y1 = d.target.y + d.ty + d.dy / 2; // Ending y-coordinate
            return (
                'M' + x0 + ',' + y0 +
                'C' + x2 + ',' + y0 + ' ' +
                x3 + ',' + y1 + ' ' +
                x1 + ',' + y1
            );
        }

        link.curvature = function (_) {
            if (!arguments.length) return curvature;
            curvature = +_; // Update curvature
            return link;
        };

        return link;
    };

    // Compute source and target links for each node
    function computeNodeLinks() {
        nodes.forEach(function (node) {
            node.sourceLinks = []; // Initialize source links
            node.targetLinks = []; // Initialize target links
        });
        links.forEach(function (link) {
            var source = link.source,
                target = link.target;
            if (typeof source === 'number') source = link.source = nodes[link.source];
            if (typeof target === 'number') target = link.target = nodes[link.target];
            source.sourceLinks.push(link); // Add to source links
            target.targetLinks.push(link); // Add to target links
        });
    }

    // Compute the value of each node (maximum of incoming or outgoing link values)
    function computeNodeValues() {
        nodes.forEach(function (node) {
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),
                d3.sum(node.targetLinks, value)
            );
        });
    }

    // Position nodes horizontally based on a predefined attribute order
    function computeNodeBreadths() {
        attributeOrder = ['buying', 'maintenance', 'doors', 'persons', 'luggage boot', 'safety'];

        attributeOrder.forEach(function (attribute, i) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });

            nodesForAttribute.forEach(function (node) {
                node.x = i; // Set x-position based on attribute index
                node.dx = nodeWidth; // Set node width
            });
        });

        moveSinksRight(attributeOrder.length); // Adjust sink node positions
        scaleNodeBreadths((size[0] - nodeWidth) / (attributeOrder.length - 1)); // Scale x-positions
    }

    // Move sink nodes to the rightmost column
    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            if (!node.sourceLinks.length) {
                node.x = x - 1; // Move to the rightmost position
            }
        });
    }

    // Scale node x-positions based on a scaling factor
    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            node.x *= kx; // Scale x-position
        });
    }

    // Compute vertical positioning of nodes
    function computeNodeDepths(iterations) {
        var nodesByBreadth = d3
            .nest()
            .key(function (d) { return d.x; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) { return d.values; });

        initializeNodeDepth(); // Initialize y-positions
        resolveCollisions(); // Ensure no overlapping
        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft((alpha *= 0.99)); // Relax nodes from right to left
            resolveCollisions(); // Ensure no overlapping
            relaxLeftToRight(alpha); // Relax nodes from left to right
            resolveCollisions(); // Ensure no overlapping
        }

        function initializeNodeDepth() {
            var ky = d3.min(nodesByBreadth, function (nodes) {
                return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
            });

            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node, i) {
                    node.y = i; // Set initial y-position
                    node.dy = node.value * ky; // Set node height
                });
            });

            links.forEach(function (link) {
                link.dy = link.value * ky; // Set link thickness
            });
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (nodes, breadth) {
                nodes.forEach(function (node) {
                    if (node.targetLinks.length) {
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha; // Adjust y-position
                    }
                });
            });

            function weightedSource(link) {
                return center(link.source) * link.value;
            }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth.slice().reverse().forEach(function (nodes) {
                nodes.forEach(function (node) {
                    if (node.sourceLinks.length) {
                        var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                        node.y += (y - center(node)) * alpha; // Adjust y-position
                    }
                });
            });

            function weightedTarget(link) {
                return center(link.target) * link.value;
            }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node, dy, y0 = 0, n = nodes.length, i;

                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy; // Adjust y if overlapping
                    y0 = node.y + node.dy + nodePadding;
                }

                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy; // Adjust for overflow
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy; // Adjust y if overlapping
                        y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) {
            return a.y - b.y; // Sort by y-position
        }
    }

    // Compute link paths between nodes
    function computeLinkDepths() {
        nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetDepth); // Sort source links
            node.targetLinks.sort(ascendingSourceDepth); // Sort target links
        });
        nodes.forEach(function (node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function (link) {
                link.sy = sy; // Set starting y-position for source link
                sy += link.dy; // Increment source link position
            });
            node.targetLinks.forEach(function (link) {
                link.ty = ty; // Set starting y-position for target link
                ty += link.dy; // Increment target link position
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y; // Sort by source y-position
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y; // Sort by target y-position
        }
    }

    // Compute color ID for nodes
    function computeColorID() {
        attributeOrder.forEach(function (attribute) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });

            nodesForAttribute.sort((a, b) => a.y - b.y);
            nodesForAttribute.forEach((node, index) => {
                node.cid = index; // Assign color ID based on position
            });
        });
    }

    function center(node) {
        return node.y + node.dy / 2; // Return center y-position of node
    }

    function value(link) {
        return link.value; // Return link value
    }

    return sankey; // Return the Sankey layout object
};

// Main IIFE to create and render the Sankey diagram
(function (d3) {
    'use strict';

    // Set up the SVG container
    const svg = d3.select('#sankey-diagram');
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const margin = { top: 50, right: 50, bottom: 150, left: 50 };
    const diagramWidth = width - margin.left - margin.right;
    const diagramHeight = height - margin.top - margin.bottom;

    var sankey = d3.sankey()
        .nodeWidth(10)
        .nodePadding(2)
        .size([diagramWidth, diagramHeight]);

    var path = sankey.link(); // Define link path

    const colorScales = {
        "buying": ['#FF5733', '#FF6F33', '#FF8533', '#FF9933'],
        "maintenance": ['#33C1FF', '#33D1FF', '#33E1FF', '#33F1FF'],
        "doors": ['#33FF57', '#33FF6F', '#33FF85', '#33FF99'],
        "persons": ['#FFC133', '#FFD133', '#FFE133'],
        'luggage boot': ['#B833FF', '#C133FF', '#D133FF'],
        "safety": ['#FF33B8', '#FF33C1', '#FF33D1'],
    };

    const render = (graph) => {
        var nodeMap = {};
        graph.nodes.forEach(function (x) {
            nodeMap[x.name] = x; // Map node names to objects
        });
        graph.links = graph.links.map(function (x) {
            return {
                source: nodeMap[x.source], // Get source node object
                target: nodeMap[x.target], // Get target node object
                value: x.value, // Set link value
            };
        });

        sankey.nodes(graph.nodes).links(graph.links).layout(32); // Compute layout

        const band = svg.append('g').selectAll('.band')
            .data(graph.links)
            .enter().append('g')
            .attr('class', 'band');

        const link = band.append('path')
            .attr('class', 'link')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .attr('d', path)
            .style('stroke', function (d) {
                return d.source.color; // Set link color based on source node
            })
            .style('stroke-width', function (d) {
                return Math.max(1, d.dy); // Set stroke width based on link thickness
            });

        link.append('title').text(function (d) {
            const totalValue = d.source.value;
            const ratio = ((d.value / totalValue) * 100).toFixed(2) + '%';
            return d.source.name + ' → ' + d.target.name + ': ' + d.value + ' (' + ratio + ')';
        });

        // Tooltip setup
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('text-align', 'center')
            .style('padding', '8px')
            .style('background', 'lightgrey')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('visibility', 'visible');

        link.on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible')
                .html(`Source: ${d.source.name}<br>Target: ${d.target.name}<br>Value: ${d.value}`);
        })
        .on('mousemove', function (event) {
            tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function () {
            tooltip.style('visibility', 'hidden');
        });

        var node = svg.append('g')
            .selectAll('.node')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', function (d) {
                return `translate(${margin.left + d.x},${margin.top + d.y})`;
            })
            .call(d3.drag().subject(function (d) {
                return d;
            }).on('start', function () {
                this.parentNode.appendChild(this);
            }).on('drag', dragmove));

        node.append('rect')
            .attr('height', function (d) {
                return d.dy; // Set rectangle height based on node value
            })
            .attr('width', sankey.nodeWidth()) // Set node width
            .style('fill', function (d) {
                const colorScale = colorScales[d.name.split('-')[0]];
                return (d.color = colorScale ? colorScale[d.cid % colorScale.length] : '#ccc');
            })
            .style('stroke', function (d) {
                return d3.rgb(d.color).darker(2); // Set stroke color
            })
            .append('title')
            .text(function (d) {
                return d.name; // Set tooltip text for nodes
            });

        node.append('text')
            .attr('x', -6)
            .attr('y', function (d) {
                return d.dy / 2; // Center text vertically
            })
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .text(function (d) {
                return d.label.split('-')[1]; // Display part of node name
            })
            .filter(function (d) {
                return d.x < width / 2; // Adjust position for left-aligned nodes
            })
            .attr('x', 6 + sankey.nodeWidth())
            .attr('text-anchor', 'start');

        // Enable dragging for nodes (arbitrary drag)
        node.call(
            d3.drag()
                .subject(function (d) {
                    return d;
                })
                .on('start', function () {
                    this.parentNode.appendChild(this); // Bring node to front when dragging
                })
                .on('drag', dragmove)
        );

        function dragmove(d) {
            // Allow nodes to move both horizontally and vertically within bounds
            d.x = Math.max(0, Math.min(diagramWidth - sankey.nodeWidth(), d3.event.x - margin.left));
            d.y = Math.max(0, Math.min(diagramHeight, d3.event.y - margin.top));
            d3.select(this).attr('transform', `translate(${margin.left + d.x},${margin.top + d.y})`);
            sankey.relayout();
            link.attr('d', path);
        }
    };

    // Load data and transform it for rendering
    const data_path = "http://vis.lab.djosix.com:2024/data/car.data";

    d3.text(data_path).then(function (r) {
        var loadedData = 'buying,maintenance,doors,persons,luggage boot,safety\n' + r;
        var data = d3.csvParse(loadedData);

        const transformData = (d) => {
            const nodesById = {};
            const linksMap = {};
            const column = d.columns;
            const n = column.length;

            d.forEach((row) => {
                for (var i = 0; i < n - 1; i++) {
                    const source = column[i] + '-' + row[column[i]];
                    const target = column[i + 1] + '-' + row[column[i + 1]];

                    if (target === '' || target === '-') {
                        break;
                    }
                    const linkKey = source + '->' + target;

                    if (!linksMap[linkKey]) {
                        linksMap[linkKey] = {
                            source: source,
                            target: target,
                            value: 0,
                        };
                    }

                    linksMap[linkKey].value += 1; // Increment link value for repeated connections
                    nodesById[source] = true; // Register source node
                    nodesById[target] = true; // Register target node
                }
            });

            // Create nodes array from unique node IDs
            const nodes = Object.keys(nodesById).map((id) => ({
                name: id,
                label: id.substr(0, 20), // Trim label for better display
            }));

            // Create links array from link objects
            const links = Object.values(linksMap);

            return { nodes: nodes, links: links }; // Return transformed data structure
        };

        // Transform data and render the Sankey diagram
        const transformedData = transformData(data);
        render(transformedData);
    });

}(d3));

