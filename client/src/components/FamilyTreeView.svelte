<script>
    let { person, persons, relationships } = $props();

    const NODE_W = 120;
    const NODE_H = 70;
    const H_GAP = 40;   // vandret mellemrum mellem søskende/noder
    const V_GAP = 90;   // lodret mellemrum mellem niveauer

    function initials(name) {
        return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }

    // Find relaterede personer
    function findRelated(personId, types) {
        const results = [];
        for (const r of relationships) {
            if (r.type === "parent") {
                if (types.includes("parent") && r.related_person_id === personId) {
                    const p = persons.find((p) => p.id === r.person_id);
                    if (p) results.push({ person: p, relType: "parent" });
                }
                if (types.includes("child") && r.person_id === personId) {
                    const p = persons.find((p) => p.id === r.related_person_id);
                    if (p) results.push({ person: p, relType: "child" });
                }
            } else if (r.type === "child") {
                if (types.includes("child") && r.related_person_id === personId) {
                    const p = persons.find((p) => p.id === r.person_id);
                    if (p) results.push({ person: p, relType: "child" });
                }
                if (types.includes("parent") && r.person_id === personId) {
                    const p = persons.find((p) => p.id === r.related_person_id);
                    if (p) results.push({ person: p, relType: "parent" });
                }
            } else if (types.includes(r.type)) {
                if (r.person_id === personId) {
                    const p = persons.find((p) => p.id === r.related_person_id);
                    if (p) results.push({ person: p, relType: r.type });
                } else if (r.related_person_id === personId) {
                    const p = persons.find((p) => p.id === r.person_id);
                    if (p) results.push({ person: p, relType: r.type });
                }
            }
        }
        return results.filter(
            (item, index, self) => self.findIndex((i) => i.person.id === item.person.id) === index
        );
    }

    let parents      = $derived(findRelated(person.id, ["parent"]));
    let children     = $derived(findRelated(person.id, ["child"]));
    let spouses      = $derived(findRelated(person.id, ["spouse"]));
    let siblings     = $derived(findRelated(person.id, ["sibling"]));
    let grandparents = $derived(
        parents.flatMap((p) => findRelated(p.person.id, ["parent"]))
               .filter((item, i, self) => self.findIndex((x) => x.person.id === item.person.id) === i)
    );
    let grandchildren = $derived(
        children.flatMap((c) => findRelated(c.person.id, ["child"]))
                .filter((item, i, self) => self.findIndex((x) => x.person.id === item.person.id) === i)
    );

    // ---- Layout beregning ----
    // Niveauer fra top til bund:
    //   0: bedsteforældre
    //   1: forældre
    //   2: stammen (person + ægtefæller + søskende)
    //   3: børn
    //   4: børnebørn

    const LEVELS = 5;

    // Returner alle noder med x,y og type
    let layout = $derived(computeLayout());

    function computeLayout() {
        const nodes = [];
        const lines = [];

        // Hjælper: placer en række af noder centreret om en x
        function placeRow(items, level, type, color) {
            if (items.length === 0) return [];
            const totalW = items.length * NODE_W + (items.length - 1) * H_GAP;
            const startX = -totalW / 2;
            const y = level * (NODE_H + V_GAP);
            return items.map((item, i) => ({
                id: item.person ? item.person.id : `${type}-${i}`,
                person: item.person || item,
                x: startX + i * (NODE_W + H_GAP),
                y,
                type,
                color,
            }));
        }

        // Bedsteforældre (niveau 0)
        const gpNodes = placeRow(grandparents, 0, "grandparent", "#8B6914");

        // Forældre (niveau 1)
        const pNodes = placeRow(parents, 1, "parent", "#7a5c2e");

        // Stammen — person i midten, søskende til venstre, ægtefæller til højre (niveau 2)
        const trunkY = 2 * (NODE_H + V_GAP);
        const trunkNode = {
            id: person.id,
            person,
            x: 0,
            y: trunkY,
            type: "trunk",
            color: "#2d4a22",
        };

        const siblingNodes = siblings.map((s, i) => ({
            id: s.person.id,
            person: s.person,
            x: -(i + 1) * (NODE_W + H_GAP),
            y: trunkY,
            type: "sibling",
            color: "#2e5c7a",
        }));

        const spouseNodes = spouses.map((s, i) => ({
            id: s.person.id,
            person: s.person,
            x: (i + 1) * (NODE_W + H_GAP),
            y: trunkY,
            type: "spouse",
            color: "#6b3a8a",
        }));

        // Børn (niveau 3)
        const cNodes = placeRow(children, 3, "child", "#1a6b3c");

        // Børnebørn (niveau 4)
        const gcNodes = placeRow(grandchildren, 4, "grandchild", "#155a30");

        // Alle noder samlet
        const allNodes = [...gpNodes, ...pNodes, trunkNode, ...siblingNodes, ...spouseNodes, ...cNodes, ...gcNodes];

        // ---- Linjer ----
        const trunkCx = trunkNode.x + NODE_W / 2;
        const trunkCy = trunkNode.y + NODE_H / 2;

        // Bedsteforældre → forældre
        gpNodes.forEach((gp) => {
            pNodes.forEach((p) => {
                lines.push({
                    x1: gp.x + NODE_W / 2,
                    y1: gp.y + NODE_H,
                    x2: p.x + NODE_W / 2,
                    y2: p.y,
                    color: "#c4a265",
                    dash: "6,4",
                });
            });
        });

        // Forældre → stammen
        pNodes.forEach((p) => {
            lines.push({
                x1: p.x + NODE_W / 2,
                y1: p.y + NODE_H,
                x2: trunkCx,
                y2: trunkNode.y,
                color: "#7a5c2e",
                dash: null,
            });
        });

        // Søskende — vandret linje til stammen
        siblingNodes.forEach((s) => {
            lines.push({
                x1: s.x + NODE_W,
                y1: s.y + NODE_H / 2,
                x2: trunkNode.x,
                y2: trunkNode.y + NODE_H / 2,
                color: "#2e5c7a",
                dash: "5,4",
            });
        });

        // Ægtefæller — vandret linje til stammen
        spouseNodes.forEach((s) => {
            lines.push({
                x1: trunkNode.x + NODE_W,
                y1: trunkNode.y + NODE_H / 2,
                x2: s.x,
                y2: s.y + NODE_H / 2,
                color: "#6b3a8a",
                dash: "5,4",
            });
        });

        // Stammen → børn
        if (cNodes.length === 1) {
            lines.push({
                x1: trunkCx,
                y1: trunkNode.y + NODE_H,
                x2: cNodes[0].x + NODE_W / 2,
                y2: cNodes[0].y,
                color: "#1a6b3c",
                dash: null,
            });
        } else if (cNodes.length > 1) {
            // Lodret linje ned fra stammen til midterhorisont
            const midY = trunkNode.y + NODE_H + V_GAP / 2;
            lines.push({ x1: trunkCx, y1: trunkNode.y + NODE_H, x2: trunkCx, y2: midY, color: "#1a6b3c", dash: null });

            // Vandret linje hen over alle børn
            const leftX = cNodes[0].x + NODE_W / 2;
            const rightX = cNodes[cNodes.length - 1].x + NODE_W / 2;
            lines.push({ x1: leftX, y1: midY, x2: rightX, y2: midY, color: "#1a6b3c", dash: null });

            // Lodret linje ned til hvert barn
            cNodes.forEach((c) => {
                lines.push({ x1: c.x + NODE_W / 2, y1: midY, x2: c.x + NODE_W / 2, y2: c.y, color: "#1a6b3c", dash: null });
            });
        }

        // Børn → børnebørn
        if (gcNodes.length === 1) {
            const parent = cNodes[0];
            if (parent) {
                lines.push({
                    x1: parent.x + NODE_W / 2,
                    y1: parent.y + NODE_H,
                    x2: gcNodes[0].x + NODE_W / 2,
                    y2: gcNodes[0].y,
                    color: "#155a30",
                    dash: null,
                });
            }
        } else if (gcNodes.length > 1) {
            const midY = cNodes[0]?.y + NODE_H + V_GAP / 2;
            const leftX = gcNodes[0].x + NODE_W / 2;
            const rightX = gcNodes[gcNodes.length - 1].x + NODE_W / 2;

            cNodes.forEach((c) => {
                lines.push({ x1: c.x + NODE_W / 2, y1: c.y + NODE_H, x2: c.x + NODE_W / 2, y2: midY, color: "#155a30", dash: null });
            });

            lines.push({ x1: leftX, y1: midY, x2: rightX, y2: midY, color: "#155a30", dash: null });

            gcNodes.forEach((gc) => {
                lines.push({ x1: gc.x + NODE_W / 2, y1: midY, x2: gc.x + NODE_W / 2, y2: gc.y, color: "#155a30", dash: null });
            });
        }

        // Beregn viewBox
        const allX = allNodes.map((n) => n.x);
        const allY = allNodes.map((n) => n.y);
        const minX = Math.min(...allX) - 60;
        const minY = Math.min(...allY) - 40;
        const maxX = Math.max(...allX) + NODE_W + 60;
        const maxY = Math.max(...allY) + NODE_H + 40;

        return {
            nodes: allNodes,
            lines,
            viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    let hasRelations = $derived(
        parents.length > 0 || children.length > 0 || spouses.length > 0 ||
        siblings.length > 0 || grandparents.length > 0 || grandchildren.length > 0
    );
</script>

<div class="tree-wrapper">
    {#if !hasRelations}
        <p class="no-relations">Ingen relationer tilføjet endnu. Brug "Tilføj relation" knappen.</p>
    {:else}
        <!-- Legend -->
        <div class="legend">
            <span class="legend-item" style="--c:#8B6914">Bedsteforældre</span>
            <span class="legend-item" style="--c:#7a5c2e">Forældre</span>
            <span class="legend-item" style="--c:#2e5c7a">Søskende</span>
            <span class="legend-item" style="--c:#2d4a22">⭐ Valgt</span>
            <span class="legend-item" style="--c:#6b3a8a">Ægtefælle</span>
            <span class="legend-item" style="--c:#1a6b3c">Børn</span>
            <span class="legend-item" style="--c:#155a30">Børnebørn</span>
        </div>

        <div class="svg-scroll">
            <svg
                viewBox={layout.viewBox}
                width={layout.width}
                height={layout.height}
                xmlns="http://www.w3.org/2000/svg"
            >
                <!-- Linjer (tegnes først så de er bag noderne) -->
                {#each layout.lines as line}
                    <line
                        x1={line.x1} y1={line.y1}
                        x2={line.x2} y2={line.y2}
                        stroke={line.color}
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-dasharray={line.dash ?? "none"}
                        opacity="0.75"
                    />
                {/each}

                <!-- Noder -->
                {#each layout.nodes as node}
                    <!-- Skygge -->
                    <rect
                        x={node.x + 3} y={node.y + 3}
                        width={NODE_W} height={NODE_H}
                        rx="10" ry="10"
                        fill="rgba(0,0,0,0.08)"
                    />

                    <!-- Kortbaggrund -->
                    <rect
                        x={node.x} y={node.y}
                        width={NODE_W} height={NODE_H}
                        rx="10" ry="10"
                        fill={node.type === "trunk" ? node.color : "white"}
                        stroke={node.color}
                        stroke-width={node.type === "trunk" ? 0 : 2}
                    />

                    <!-- Avatar cirkel -->
                    <circle
                        cx={node.x + 26} cy={node.y + NODE_H / 2}
                        r="20"
                        fill={node.type === "trunk" ? "rgba(255,255,255,0.2)" : node.color}
                    />

                    <!-- Initialer -->
                    <text
                        x={node.x + 26} y={node.y + NODE_H / 2 + 5}
                        text-anchor="middle"
                        font-size="13"
                        font-weight="bold"
                        fill={node.type === "trunk" ? "white" : "white"}
                        font-family="system-ui, sans-serif"
                    >
                        {initials(node.person.name)}
                    </text>

                    <!-- Navn -->
                    <text
                        x={node.x + 54} y={node.y + NODE_H / 2 - 6}
                        font-size="11"
                        font-weight="600"
                        fill={node.type === "trunk" ? "white" : "#222"}
                        font-family="system-ui, sans-serif"
                    >
                        {node.person.name.length > 12 ? node.person.name.slice(0, 11) + "…" : node.person.name}
                    </text>

                    <!-- Fødselsdato -->
                    {#if node.person.birth_date}
                        <text
                            x={node.x + 54} y={node.y + NODE_H / 2 + 10}
                            font-size="10"
                            fill={node.type === "trunk" ? "rgba(255,255,255,0.8)" : "#888"}
                            font-family="system-ui, sans-serif"
                        >
                            f. {node.person.birth_date.slice(0, 4)}
                        </text>
                    {/if}

                    <!-- Dødsdato -->
                    {#if node.person.death_date}
                        <text
                            x={node.x + 54} y={node.y + NODE_H / 2 + 22}
                            font-size="10"
                            fill={node.type === "trunk" ? "rgba(255,255,255,0.8)" : "#aaa"}
                            font-family="system-ui, sans-serif"
                        >
                            d. {node.person.death_date.slice(0, 4)}
                        </text>
                    {/if}

                    <!-- Stjerne på stammen -->
                    {#if node.type === "trunk"}
                        <text
                            x={node.x + NODE_W - 14} y={node.y + 16}
                            font-size="12"
                            font-family="system-ui, sans-serif"
                        >⭐</text>
                    {/if}
                {/each}
            </svg>
        </div>
    {/if}
</div>

<style>
    .tree-wrapper {
        padding: 1rem;
        overflow: auto;
    }

    .svg-scroll {
        overflow-x: auto;
        overflow-y: auto;
        max-height: 70vh;
        display: flex;
        justify-content: center;
        padding: 1rem;
    }

    .svg-scroll svg {
        display: block;
        min-width: 300px;
    }

    .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
        margin-bottom: 1rem;
        padding: 0.5rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.78rem;
        color: #555;
        font-weight: 500;
    }

    .legend-item::before {
        content: "";
        width: 12px;
        height: 12px;
        border-radius: 3px;
        background: var(--c);
        display: inline-block;
        flex-shrink: 0;
    }

    .no-relations {
        color: #aaa;
        font-style: italic;
        font-size: 0.9rem;
        text-align: center;
        padding: 2rem;
    }
</style>
