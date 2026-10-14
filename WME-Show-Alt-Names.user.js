// ==UserScript==
// @name            WME Show Alt Names
// @description     Shows alt names for selected segments
// @version         2026.10.14.09
// @author          The_Cre8r / SAR85 / kid4rm89s
// @copyright       SAR85 / The_Cre8r / kid4rm89s
// @license         CC BY-NC-ND
// @grant           unsafeWindow
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @namespace       https://greasyfork.org/users/1087400
// @connect         greasyfork.org
// @grant           GM_xmlhttpRequest
// @require         https://update.greasyfork.org/scripts/24851/WazeWrap.js
// @downloadURL     https://update.greasyfork.org/scripts/574195/WME%20Show%20Alt%20Names.user.js
// @updateURL       https://update.greasyfork.org/scripts/574195/WME%20Show%20Alt%20Names.meta.js
// ==/UserScript==
//
// I would like to thank SAR85 and The_Cre8r for their hard work on this project, unfortunately with their absence there wasn't anyone who updated his script.
// Please note, if they do return, my continued development and support may stop and my work may be forfeited. Thank you and feel free to contact me for any issues.
//-----------------------------------------------------------------------------------------------

/* global $ */
/* global unsafeWindow */

(function () {
    const updateMessage = `<strong>✨What's New :</strong><br> - The panel is now draggable via the new handle at the top; its position is remembered.<br> - Migrated the script to the WME SDK async mode for improved performance and reliability.<br><br> - Please report any bugs or issues you encounter.`;
    const scriptName = GM_info.script.name;
    const scriptVersion = GM_info.script.version;
    const downloadUrl = 'https://update.greasyfork.org/scripts/574195/WME%20Show%20Alt%20Names.user.js';
    const forumURL = 'https://greasyfork.org/scripts/574195-wme-show-alt-names/feedback';

    const PRIMARY_LAYER = 'WME Show Alt Names';
    const HIGHLIGHT_LAYER = 'WME Show Alt Names Highlight';
    const LAYER_CHECKBOX_NAME = 'Show Alt Names';
    // WME overlays a ~20px footer across the bottom of the map viewport; reserve
    // extra room so the panel never clamps underneath it.
    const VIEWPORT_BOTTOM_INSET = 20;
    const VIEWPORT_MARGIN = 6;
    let SDK,
        altNamesElement,
        $altTable,
        segmentsWithAlternates = [],
        primaryFeatures = new Map(),
        draggableSupported = true,
        nameArray = [],
        selectedSegments = [],
        selectionRunId = 0, // Guards against overlapping async checkSelection() runs
        panelClosed = false, // Set true when the user manually closes the panel
        closedSelectionKey = null, // Selection signature at the moment of closing
        sdkEventSubscriptions = [], // Track SDK event subscriptions for cleanup
        isInitialized = false, // Prevent duplicate initialization
        CSS = {
            altTable: {
                width: '100%',
            },
            altTableClass: {
                border: '1px solid white',
                padding: '3px',
                'border-collapse': 'collapse',
                '-moz-user-select': '-moz-none',
                '-khtml-user-select': 'none',
                '-webkit-user-select': 'none',
            },
            altTableType: {
                width: '50px',
            },
            altTableID: {
                'text-align': 'center',
                'border-left': 'none',
                width: '80px',
            },
            altTableRoadType: {
                'border-radius': '10px',
                color: 'black',
                'text-shadow': '1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,0px 1px 0 #fff,1px 0px 0 #fff,0px -1px 0 #fff,-1px 0px 0 #fff',
                border: '1px solid white',
                'font-size': '0.8em',
                'text-align': 'center',
                padding: '0 3px 0 3px',
                'min-width': '32px',
            },
            altTableSelected: {
                'font-weight': 'bold',
                'background-color': 'white',
                color: 'black',
            },
            altDiv: {
                display: 'none',
                position: 'absolute',
                left: '6px',
                bottom: '60px',
                'min-height': '120px',
                'min-width': '335px',
                'overflow-y': 'auto',
                'overflow-x': 'auto',
                'white-space': 'nowrap',
                'background-color': 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '5px',
            },
            altDivScrollbar: {
                width: '15px',
                'border-radius': '5px',
            },
            altDivScrollbarTrack: {
                'border-radius': '5px',
                background: 'none',
                width: '10px',
            },
            altDivScrollbarThumb: {
                'background-color': 'white',
                'border-radius': '5px',
                border: '2px solid black',
            },
            altDivScrollbarCorner: {
                background: 'none',
            },
            altOptionsButton: {
                margin: '0 0 3px 3px',
                height: '2em',
                'font-size': '0.8em',
            },
            autoSelectButton: {
                display: 'none',
            },
            optionsDiv: {
                display: 'none',
                clear: 'both',
                border: '1px solid white',
                padding: '3px',
                margin: ' 0 0 3px 0',
                'font-weight': 'normal',
            },
            optionsDivTd: {
                'padding-right': '5px',
            },
            optionsDivInput: {
                'margin-right': '3px',
            },
        },
        ROAD_TYPES = {
            1: { name: 'St', expColor: '#FFFFDD' },
            2: { name: 'PS', expColor: '#FDFAA7' },
            3: { name: 'Fwy', expColor: '#6870C3' },
            4: { name: 'Rmp', expColor: '#B3BFB3' },
            5: { name: 'Trl', expColor: '#B0A790' },
            6: { name: 'MH', expColor: '#469FBB' },
            7: { name: 'mH', expColor: '#69BF88' },
            8: { name: 'Dirt', expColor: '#867342' },
            10: { name: 'Bdwk', expColor: '#9A9A9A' },
            16: { name: 'Stwy', expColor: '#9A9A9A' },
            17: { name: 'Pvt', expColor: '#BEBA6C' },
            18: { name: 'RR', expColor: '#B2B6B4' },
            19: { name: 'Rwy', expColor: '#222222' },
            20: { name: 'PLR', expColor: '#ABABAB' },
            //add ferry
        };

    /**
     * Returns a random color in rgba() notation.
     * @param {Number} opacity The desirected opacity (a value of the color).
     * returns {String} The rgba() color.
     */
    function randomRgbaColor(opacity) {
        opacity = opacity || 0.8;
        function random255() {
            return Math.floor(Math.random() * 255);
        }
        return 'rgba(' + random255() + ',' + random255() + ',' + random255() + ',' + opacity + ')';
    }

    /**
     * Resets the highlight state of all features on the primary layer.
     * Mutates the shared style state and asks the SDK to re-render (no re-add).
     */
    async function resetHighlight() {
        let changed = false;
        for (const [segId, feat] of primaryFeatures) {
            if (feat.properties.isHighlighted) {
                feat.properties.isHighlighted = false;
                changed = true;
            }
        }
        if (changed) await SDK.Map.redrawLayer({ layerName: PRIMARY_LAYER });
    }

    /**
     * Highlights a single feature on the primary layer with the given color.
     * Mutates the feature's properties and re-renders via the SDK
     * (no feature removal/re-adding, which is 10-100x faster).
     */
    async function highlightFeature(segmentId, color) {
        const feat = primaryFeatures.get(segmentId);
        if (!feat) return;
        feat.properties.bgColor = color;
        feat.properties.isHighlighted = true;
        await SDK.Map.redrawLayer({ layerName: PRIMARY_LAYER });
    }

    /**
     * Pans the map to a segment specified by its ID.
     * @param {Number} id The ID of the segment.
     */
    async function panToSegment(id) {
        if (!id) return;
        const segment = await SDK.DataModel.Segments.getById({ segmentId: id });
        if (!segment) return;
        const coords = segment.geometry.coordinates;
        const lons = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        await SDK.Map.setMapCenter({
            lonLat: {
                lon: (Math.min(...lons) + Math.max(...lons)) / 2,
                lat: (Math.min(...lats) + Math.max(...lats)) / 2,
            },
        });
    }

    /**
     * Selects a segment specified by its ID.
     * @param {Number} id The ID of the segment.
     */
    async function selectSegment(id) {
        if (!id) return;
        await SDK.Editing.setSelection({
            selection: { ids: [id], objectType: 'segment' },
        });
    }

    /**
     * Event handler for changing the highlight color for a segment.
     * @param {Event} event
     */
    function changeHighlightColor(event) {
        let i,
            n,
            $this = $(this),
            name = $this.find('.altTable-primary-name').text() || $this.find('.altTable-alt-name').text(),
            city = $this.find('.altTable-primary-city').text() || $this.find('.altTable-alt-city').text(),
            useCity = $('#altUseCity').prop('checked');
        for (i = 0, n = nameArray.length; i < n; i++) {
            if (nameArray[i].name === name && (useCity ? nameArray[i].city === city : true)) {
                nameArray[i].color = randomRgbaColor();
                colorTable();
                $this.trigger('mouseenter', { singleSegment: false });
                break;
            }
        }
    }

    /**
     * Lookup function for the display color of a specified road type.
     * Falls back to the hardcoded ROAD_TYPES table (abbreviation + colour),
     * optionally overriding the label with the SDK's localized name.
     * @param {Number} type The roadType to look up.
     * @returns {Object} Object of form:
     * {typeString: 'RoadTypeName', typeColor: '#FFFFFF'},
     * where RoadTypeName is an abbreviated form of the name of the road type
     * and typeColor is the hex value of the display color.
     */
    const roadTypeNames = new Map();
    function getRoadColor(type) {
        if (type && ROAD_TYPES[type] !== undefined) {
            if (!roadTypeNames.size) {
                try {
                    (SDK.DataModel.Segments.getRoadTypes() ?? []).forEach(rt => roadTypeNames.set(rt.id, rt.localizedName || rt.name));
                } catch (e) {
                    // Non-fatal: fall back to hardcoded abbreviations.
                }
            }
            return {
                typeString: roadTypeNames.get(type) ?? ROAD_TYPES[type].name,
                typeColor: ROAD_TYPES[type].expColor,
            };
        } else {
            return { typeString: 'error', typeColor: ROAD_TYPES[1].expColor };
        }
    }

    /**
     * Resolves a street/city pair to display strings, normalising empties.
     */
    function describeAddress(address) {
        const street = address?.street;
        const city = address?.city;
        return {
            name: street ? street.name || 'No name' : 'New road',
            city: city ? city.name || 'No city' : 'New road',
        };
    }

    /**
     * Data structure for segment information used to build highlight layer
     * features and the alternate names table.
     *
     * Async factory because resolving the address is a Promise in async SDK mode.
     * Use `await SegmentWithAlternate.create(segment)`.
     */
    class SegmentWithAlternate {
        constructor(sdkSegment) {
            this.segmentID = sdkSegment.id;

            // Backward-compatible attributes object (used by sortSegmentsByNode).
            this.attributes = {
                id: sdkSegment.id,
                primaryStreetID: sdkSegment.primaryStreetId,
                streetIDs: sdkSegment.alternateStreetIds,
                roadType: sdkSegment.roadType,
                length: sdkSegment.length,
                fromNodeID: sdkSegment.fromNodeId,
                toNodeID: sdkSegment.toNodeId,
            };

            this.primaryName = 'New road';
            this.primaryCity = 'New road';
            this.alternates = [];
            this.sdkFeature = null;
            this.tableRow = null;
        }

        static async create(sdkSegment) {
            const instance = new SegmentWithAlternate(sdkSegment);
            await instance.resolveAddress(sdkSegment);
            instance.buildFeature(sdkSegment);
            instance.tableRow = instance.createTableRow();
            return instance;
        }

        async resolveAddress(sdkSegment) {
            // Single call resolves primary + alternate street/city (replaces N lookups).
            const address = await SDK.DataModel.Segments.getAddress({ segmentId: sdkSegment.id });
            const primary = describeAddress(address);
            this.primaryName = primary.name;
            this.primaryCity = primary.city;
            this.alternates = (address?.altStreets ?? []).map(describeAddress);
        }

        buildFeature(sdkSegment) {
            const roadColor = getRoadColor(sdkSegment.roadType);

            // GeoJSON feature for SDK layer — replaces OL Feature.Vector.
            this.sdkFeature = {
                id: sdkSegment.id,
                type: 'Feature',
                geometry: sdkSegment.geometry,
                properties: {
                    id: sdkSegment.id,
                    roadType: sdkSegment.roadType,
                    length: sdkSegment.length,
                    bgColor: roadColor.typeColor,
                    isHighlighted: false,
                    alt: this.alternates,
                    primary: { name: this.primaryName, city: this.primaryCity },
                },
            };
        }

        createTableRow() {
            let $row, $cell, roadType;

            $row = $('<tr/>').attr('id', 'alt' + this.segmentID);

            //add road type to row
            roadType = getRoadColor(this.attributes.roadType);
            $cell = $('<td/>')
                .addClass('altTable-type')
                .css('border-right', 'none')
                .append($('<div/>').addClass('altTable-roadType').css('background-color', roadType.typeColor).text(roadType.typeString))
                .append(
                    $('<div/>')
                        .css({ 'text-align': 'center', 'font-size': '0.8em' })
                        .text(this.attributes.length + ' m')
                );
            $row.append($cell);

            //add id to row
            $cell = $('<td/>').addClass('altTable-id').css('border-left', 'none').append($('<div/>').text(this.segmentID));
            $row.append($cell);

            //add primary name and city to row
            $cell = $('<td/>').addClass('altTable-primary').append($('<div/>').addClass('altTable-primary-name').text(this.primaryName)).append($('<div/>').addClass('altTable-primary-city').text(this.primaryCity));
            $row.append($cell);

            //add alt names and cities to row
            for (let i = 0; i < this.alternates.length; i++) {
                $cell = $('<td/>').addClass('altTable-alt').append($('<div/>').addClass('altTable-alt-name').text(this.alternates[i].name)).append($('<div/>').addClass('altTable-alt-city').text(this.alternates[i].city));
                $row.append($cell);
            }
            return $row;
        }
    }

    /**
     * Colors the table cells based on segment/city name.
     */
    function colorTable() {
        'use strict';
        let i,
            n,
            useCity = $('#altUseCity').prop('checked');

        $altTable.find('.altTable-primary, .altTable-alt').each(function (index1) {
            let $this = $(this),
                name = $this.find('.altTable-primary-name').text() || $this.find('.altTable-alt-name').text(),
                city = $this.find('.altTable-primary-city').text() || $this.find('.altTable-alt-city').text(),
                match = false,
                color;

            for (i = 0, n = nameArray.length; i < n; i++) {
                if (nameArray[i].name === name && (useCity ? nameArray[i].city === city : true)) {
                    $this.css('background-color', nameArray[i].color);
                    match = true;
                    break;
                }
            }
            if (match === false) {
                color = randomRgbaColor();
                $this.css('background-color', color);
                nameArray.push({ name: name, city: city, color: color });
            }
            match = false;
        });
    }

    /**
     * Populates the table with segment information
     * @param {Number} namesColumnCount The maxiumum number of alternates
     * a segment has (how many "Alt" columns are needed).
     * @param {Boolean} sortByNode Whether to sort the table in driving
     * order by node ID.
     */
    function populateTable(namesColumnCount, sortByNode) {
        'use strict';
        let i, n, j, m, $row;

        // Empty table contents.
        $altTable.find('tbody').empty();
        $('.altTable-header-alt').remove();

        // Sort if needed.
        if (sortByNode) {
            sortSegmentsByNode();
        }

        // Add table rows for each segment.
        for (i = 0, n = selectedSegments.length; i < n; i++) {
            $row = selectedSegments[i].tableRow.clone();
            for (j = selectedSegments[i].alternates.length, m = namesColumnCount; j < m; j++) {
                $row.append($('<td/>').addClass('altTable-placeholder'));
            }
            $altTable.append($row);
        }

        // Add column headings for alt names.
        for (i = 1, n = namesColumnCount; i <= n; i++) {
            $('#altTable-header').append(
                $('<th/>')
                    .addClass('altTable-header-alt')
                    .text('Alt ' + i)
            );
        }

        $('#altShowCity').change();
        colorTable();
    }

    /**
     * Callback for hovering over segment name in the table that
     * colors all features on the altLayer with the same name/city as the
     * one being hovered over.
     * @callback
     * @param {jQuery} $el The cell from the table to match.
     * @param {String} color The rgba-formatted color value.
     */
    async function colorFeatures($el, color) {
        'use strict';
        let i,
            n,
            j,
            t,
            colorValues,
            feature,
            names,
            name = $el.find('.altTable-primary-name').text() || $el.find('.altTable-alt-name').text(),
            city = $el.find('.altTable-primary-city').text() || $el.find('.altTable-alt-city').text(),
            useCity = $('#altUseCity').prop('checked');

        //remove opacity from color so it can be controlled by layer style
        colorValues = color.match(/\d+/g);
        color = 'rgb(' + colorValues[0] + ',' + colorValues[1] + ',' + colorValues[2] + ')';

        for (const [segId, feat] of primaryFeatures) {
            const names = feat.properties.alt.concat(feat.properties.primary);
            for (j = 0, t = names.length; j < t; j++) {
                if (names[j].name === name && (useCity ? names[j].city === city : true)) {
                    highlightFeature(segId, color);
                    break;
                }
            }
        }
    }

    /**
     * Callback for hovering over a segment ID in the table. Highlights the
     * corresponding altLayer feature black or as specified.
     * @callback
     * @param {Number} id The segment ID to highlight.
     * @param {String} color The rgba-formatted color (optional--default is
     * black).
     */
    async function colorSegment(id, color) {
        'use strict';
        color = color || 'rgba(0, 0, 0, 0.8)';
        await highlightFeature(id, color);
    }

    /**
     * Handles table events for hovering and calls appropriate function
     * for highlighting.
     * @callback
     * @param {Event} event The event object.
     */
    function applyHighlighting(event) {
        let $this1,
            name1,
            city1,
            useCity = $('#altUseCity').prop('checked');
        switch (event.type) {
            case 'mouseenter':
                $this1 = $(this);
                if (event.data.singleSegment) {
                    void colorSegment($this1.text());
                    $this1.parent().addClass('altTable-selected');
                } else {
                    void colorFeatures($this1, $this1.css('background-color'));
                    if ($this1.hasClass('altTable-primary')) {
                        name1 = $this1.find('.altTable-primary-name').text();
                        city1 = $this1.find('.altTable-primary-city').text();
                    } else {
                        name1 = $this1.find('.altTable-alt-name').text();
                        city1 = $this1.find('.altTable-alt-city').text();
                    }
                    $('#altTable tbody td').each(function (index) {
                        let $this2 = $(this),
                            name2 = $this2.find('.altTable-primary-name').text() || $this2.find('.altTable-alt-name').text(),
                            city2 = $this2.find('.altTable-primary-city').text() || $this2.find('.altTable-alt-city').text();
                        if (name1 === name2 && (useCity ? city1 === city2 : true)) {
                            $this2.parent().addClass('altTable-selected');
                        }
                    });
                }

                break;
            case 'mouseleave':
                void resetHighlight();
                $('#altTable tr').each(function (index) {
                    $(this).removeClass('altTable-selected');
                });
                break;
        }
    }

    /**
     * Event handler for selection events. Checks for appropriate condions
     * for running script, creates Alternate objects as necessary,
     * displays/hides UI elements.
     * @callback
     */
    async function checkSelection() {
        // Claim a run token. Any older in-flight run that has awaited will bail out
        // when it resumes, preventing overlapping runs from double-populating the table.
        const runId = ++selectionRunId;

        if (!(await SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER }))) {
            return;
        }
        if (runId !== selectionRunId) return;

        const sdkSel = await SDK.Editing.getSelection();
        if (runId !== selectionRunId) return;

        // A manual close suppresses the panel only while the selection stays the
        // same. Any new/changed segment selection re-opens it automatically.
        const selectionKey = sdkSel && sdkSel.objectType === 'segment'
            ? sdkSel.ids.slice().sort().join(',')
            : null;
        if (panelClosed) {
            if (selectionKey === null || selectionKey === closedSelectionKey) {
                await SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
                primaryFeatures.clear();
                segmentsWithAlternates = [];
                selectedSegments = [];
                return;
            }
            // Selection changed since closing — reopen.
            panelClosed = false;
            closedSelectionKey = null;
        }

        let nameColumnsCount = 0;
        selectedSegments = [];

        if (!sdkSel || sdkSel.objectType !== 'segment') {
            altNamesElement.fadeOut();
            await SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
            if (runId !== selectionRunId) return;
            primaryFeatures.clear();
            segmentsWithAlternates = [];
            nameArray = []; // Clear nameArray to prevent memory leak
            return;
        }

        const selectedIds = sdkSel.ids;

        await SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
        if (runId !== selectionRunId) return;
        primaryFeatures.clear();
        segmentsWithAlternates = [];

        for (const segmentId of selectedIds) {
            const sdkSegment = await SDK.DataModel.Segments.getById({ segmentId });
            if (runId !== selectionRunId) return;
            if (!sdkSegment) continue;

            let segmentWithAlternates = await SegmentWithAlternate.create(sdkSegment);
            if (runId !== selectionRunId) return;
            segmentsWithAlternates.push(segmentWithAlternates);
            selectedSegments.push(segmentWithAlternates);
            primaryFeatures.set(segmentId, segmentWithAlternates.sdkFeature);
            await SDK.Map.addFeatureToLayer({ layerName: PRIMARY_LAYER, feature: segmentWithAlternates.sdkFeature });

            if (segmentWithAlternates.alternates.length >= nameColumnsCount) {
                nameColumnsCount = segmentWithAlternates.alternates.length;
                selectedSegments.namesColumnCount = nameColumnsCount;
            }
        }

        if (runId !== selectionRunId) return;
        populateTable(nameColumnsCount, $('#altSortByNode').prop('checked'));
        altNamesElement.fadeIn();
        // Re-align after the table grows so extra rows/columns can't push the
        // panel out of the viewport when many segments are selected.
        clampPanelToViewport();
    }

    /**
     * Checks all segments in WME for alt names and adds feature for
     * highlighting.
     */
    async function checkAllSegments() {
        await SDK.Map.removeAllFeaturesFromLayer({ layerName: HIGHLIGHT_LAYER });
        if (!(await SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER })) || !$('#altHighlights').prop('checked')) {
            return;
        }

        const allSegments = await SDK.DataModel.Segments.getAll();
        const highlightFeatures = (allSegments ?? [])
            .filter(seg => seg.alternateStreetIds?.length > 0)
            .map(seg => ({
                id: seg.id,
                type: 'Feature',
                geometry: seg.geometry,
                properties: {},
            }));
        if (highlightFeatures.length > 0) {
            await SDK.Map.addFeaturesToLayer({ layerName: HIGHLIGHT_LAYER, features: highlightFeatures });
        }
    }

    /**
     * Sorts the selected segments in "driving order" starting with first
     * selected based on Node ID.
     */
    function sortSegmentsByNode(useFromNode) {
        'use strict';
        let path = [],
            startingNodeID = useFromNode ? selectedSegments[0].attributes.fromNodeID : selectedSegments[0].attributes.toNodeID;
        let findNextSegment = function (nodeID) {
            let fromNodeMatched = false,
                nextNode,
                tempPath = [],
                toNodeMatched = false;
            _.each(selectedSegments, function (segment) {
                console.debug('Checking segment ' + segment.attributes.id);
                if (path.indexOf(segment.attributes.id) !== -1) {
                    console.debug('Segment already in path.');
                    return;
                }
                if (segment.attributes.fromNodeID === nodeID) {
                    fromNodeMatched = true;
                    tempPath.push(segment);
                } else if (segment.attributes.toNodeID === nodeID) {
                    toNodeMatched = true;
                    tempPath.push(segment);
                }
            });
            if (tempPath.length === 1) {
                path.push(tempPath[0].attributes.id);
                if (fromNodeMatched) {
                    nextNode = tempPath[0].attributes.toNodeID;
                } else if (toNodeMatched) {
                    nextNode = tempPath[0].attributes.fromNodeID;
                }
                findNextSegment(nextNode);
            }
        };

        path.push(selectedSegments[0].attributes.id);

        console.debug('Looking for connected segments at node ' + startingNodeID);
        findNextSegment(startingNodeID);

        if (path.length === 0 && !useFromNode) {
            console.debug('No connections at toNode. Looking at fromNode.');
            sortSegmentsByNode(true);
        } else {
            selectedSegments = _.sortBy(selectedSegments, function (segment) {
                return path.indexOf(segment.attributes.id);
            });
        }
    }

    async function saveOptions() {
        let options = {
            highlights: $('#altHighlights').prop('checked'),
            sortByNode: $('#altSortByNode').prop('checked'),
            useCity: $('#altUseCity').prop('checked'),
            showCity: $('#altShowCity').prop('checked'),
            layerToggle: await SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER }),
        };
        return (window.localStorage.altNamesOptions = JSON.stringify(options));
    }

    async function loadOptions() {
        let options = JSON.parse(window.localStorage.altNamesOptions ?? '{}');
        $('#altHighlights').prop('checked', options?.highlights ?? false);
        $('#altSortByNode').prop('checked', options?.sortByNode ?? false);
        $('#altUseCity').prop('checked', options?.useCity ?? false);
        $('#altShowCity').prop('checked', options?.showCity ?? false);
        await changeLayerVisibility(options?.layerToggle ?? true);
    }

    /**
     * Restores the panel's saved screen position (left/top, in px) from
     * localStorage, clamped to the current viewport so an off-screen saved
     * position can't hide the panel.
     */
    function applySavedPosition() {
        let pos;
        try {
            pos = JSON.parse(window.localStorage.altNamesPosition ?? 'null');
        } catch (e) {
            pos = null;
        }
        if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;

        const maxLeft = Math.max(0, window.innerWidth - 60);
        const maxTop = Math.max(0, window.innerHeight - VIEWPORT_BOTTOM_INSET - 40);
        const left = Math.min(Math.max(0, pos.left), maxLeft);
        const top = Math.min(Math.max(0, pos.top), maxTop);
        // Switch from the default bottom-anchored position to an explicit top.
        altNamesElement.css({ left: left + 'px', top: top + 'px', bottom: 'auto' });
    }

    /**
     * Persists the panel's current left/top (px) to localStorage.
     */
    function savePosition() {
        if (!altNamesElement) return;
        const el = altNamesElement[0];
        window.localStorage.altNamesPosition = JSON.stringify({
            left: el.offsetLeft,
            top: el.offsetTop,
        });
    }

    /**
     * Re-aligns the panel so its CURRENT (possibly grown) size stays fully
     * inside its offsetParent. Called after the table is populated so that
     * selecting more segments can't push the panel out of the viewport.
     * Only acts when the panel uses an explicit top (i.e. it was dragged);
     * the default bottom-anchored position is left untouched.
     */
    function clampPanelToViewport() {
        if (!altNamesElement || !altNamesElement.is(':visible')) return;
        const el = altNamesElement[0];
        // Skip the default bottom-anchored layout (no explicit top set).
        if (el.style.top === '' || el.style.top === 'auto') return;

        const parent = el.offsetParent;
        const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
        const parentW = parent ? parent.clientWidth : window.innerWidth;
        const parentH = parent ? parent.clientHeight : window.innerHeight;

        // Recover the panel's current position relative to its offsetParent.
        const curLeft = el.getBoundingClientRect().left - parentRect.left;
        const curTop = el.getBoundingClientRect().top - parentRect.top;

        // Reserve room for WME's bottom footer so the panel isn't hidden by it.
        const maxLeft = Math.max(0, parentW - el.offsetWidth - VIEWPORT_MARGIN);
        const maxTop = Math.max(0, parentH - el.offsetHeight - VIEWPORT_BOTTOM_INSET - VIEWPORT_MARGIN);
        const left = Math.min(Math.max(0, curLeft), maxLeft);
        const top = Math.min(Math.max(0, curTop), maxTop);

        if (left !== curLeft || top !== curTop) {
            altNamesElement.css({ left: left + 'px', top: top + 'px', bottom: 'auto' });
            savePosition();
        }
    }

    /**
     * Enables click-and-drag of the panel via the #altDragHandle icon.
     * Tracks the gesture on `document` (not the panel) so the drag keeps
     * following the cursor even when it leaves the panel bounds.
     */
    function makeDraggable() {
        const handle = document.getElementById('altDragHandle');
        if (!handle) return;

        let offsetX = 0;
        let offsetY = 0;
        let dragging = false;

        const onMove = (e) => {
            if (!dragging) return;
            const el = altNamesElement[0];
            const parentRect = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
            const maxLeft = Math.max(0, (el.offsetParent ? el.offsetParent.clientWidth : window.innerWidth) - el.offsetWidth - VIEWPORT_MARGIN);
            const maxTop = Math.max(0, (el.offsetParent ? el.offsetParent.clientHeight : window.innerHeight) - el.offsetHeight - VIEWPORT_BOTTOM_INSET - VIEWPORT_MARGIN);
            const left = Math.min(Math.max(0, e.clientX - parentRect.left - offsetX), maxLeft);
            const top = Math.min(Math.max(0, e.clientY - parentRect.top - offsetY), maxTop);
            altNamesElement.css({ left: left + 'px', top: top + 'px' });
        };

        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            altNamesElement.removeClass('alt-dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            savePosition();
        };

        const onDown = (e) => {
            if (e.button !== 0) return; // left button only
            e.preventDefault();
            const el = altNamesElement[0];
            const rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            // Freeze the current position as left/top before the first move so the
            // panel stops being bottom-anchored.
            altNamesElement.css({
                left: rect.left - (el.offsetParent ? el.offsetParent.getBoundingClientRect().left : 0) + 'px',
                top: rect.top - (el.offsetParent ? el.offsetParent.getBoundingClientRect().top : 0) + 'px',
                bottom: 'auto',
            });
            dragging = true;
            altNamesElement.addClass('alt-dragging');
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };

        handle.addEventListener('mousedown', onDown);
    }

    /**
     * Initializes the script by adding CSS and HTML to page, registering event
     * listeners, adding map layers and running main
     * functions to check for segments loaded at init and highlighting.
     */
    async function init() {
        let css, $header, optionsHTML, $row;

        css = '#altTable {width: 100%;}';
        css += '.altTable, .altTable th, .altTable td {border: 1px solid white; padding: 3px; border-collapse: collapse; -moz-user-select: -moz-none; -khtml-user-select: none; -webkit-user-select: none;}\n';
        css += '.altTable-type {width: 50px;}\n';
        css += '.altTable-id {text-align: center; border-left: none; width: 80px}\n';
        css +=
            '.altTable-roadType {border-radius: 10px; color: black; text-shadow: 1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,0px 1px 0 #fff,1px 0px 0 #fff,0px -1px 0 #fff,-1px 0px 0 #fff; border: 1px solid white; font-size: 0.8em; text-align: center; padding: 0 3px 0 3px; min-width: 32px;}';
        css += 'tr.altTable-selected > .altTable-id {font-weight: bold; background-color: white; color: black;}\n';

        css += '#altDiv {display: none; position: absolute; left: 6px; bottom: 60px; min-height: 120px; min-width: 335px;';
        css += 'overflow-y: auto; overflow-x: hidden; white-space: nowrap; background-color: rgba(0,0,0,0.8); color: white; padding: 5px; ';
        css += 'z-index: 1001; border-radius: 5px; max-height: 60%;}\n';

        // drag handle CSS (inline icon sitting at the left of the options row)
        css += '#altDragHandle {display: inline-block; vertical-align: middle; width: 18px; height: 18px; margin: 0 4px 4px 0; padding: 1px; border: 1px solid white; border-radius: 3px; cursor: move; opacity: 0.7; box-sizing: border-box;}\n';
        css += '#altDragHandle:hover {opacity: 1;}\n';
        css += '#altDragHandle svg {display: block; width: 100%; height: 100%; fill: white; pointer-events: none;}\n';
        css += '#altDiv.alt-dragging {user-select: none;}\n';

        // scroll bar CSS
        css += '#altDiv::-webkit-scrollbar {width: 15px; border-radius: 5px;}\n';
        css += '#altDiv::-webkit-scrollbar-track {border-radius: 5px; background: none; width: 10px;}\n';
        css += '#altDiv::-webkit-scrollbar-thumb {background-color: white; border-radius: 5px; border: 2px solid black;}\n';
        css += '#altDiv::-webkit-scrollbar-corner {background: none;}\n';

        // buttons css
        css += '.altOptions-button {margin: 0 0 3px 3px; height: 2em; font-size: 0.8em;}\n';
        css += '#altCloseButton {position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; margin: 0; padding: 0; line-height: 16px; text-align: center; font-size: 14px; font-weight: bold; color: white; background: transparent; border: 1px solid white; border-radius: 3px; cursor: pointer; opacity: 0.7; box-sizing: border-box; z-index: 2;}\n';
        css += '#altCloseButton:hover {opacity: 1; background-color: rgba(255,255,255,0.2);}\n';

        // Options Menu CSS
        css += '#optionsDiv {display: none; clear: both; border: 1px solid white; padding: 3px; margin: 0 0 3px 0; font-weight: normal;}';
        css += '#optionsDiv td {padding-right: 5px;}';
        css += '#optionsDiv input {margin-right: 3px;}';

        //add css to page
        $('<style/>').html(css).appendTo($(document.head));

        // Make the options menu. The drag handle sits inline at the left of the row.
        optionsHTML =
            '<div id="altOptions"> <div id="altDragHandle" title="Drag to move"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16v2H4V5zm0 6h16v2H4v-2zm0 6h16v2H4v-2z"/></svg></div><button id="altOptionsButton" class="altOptions-button">Show Options</button> <label style="float: right; margin: 3px; margin-right: 26px;"> <input id="altHighlights" type="checkbox">Highlight Alt Names</label> </div> <div id="optionsDiv"> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altShowCity">Show city name in table</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altUseCity">Use city name in name matching</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altSortByNode">Sort table by driving order (experimental)</label> </div> </div>';

        // Make the table to hold segment information.
        $altTable = $('<table/>').attr('id', 'altTable').addClass('altTable');
        $header = $('<thead/>');
        $row = $('<tr/>').attr('id', 'altTable-header');
        $row.append($('<th/>').attr('colspan', '2').text('Segment ID'));
        $row.append($('<th/>').text('Primary'));
        $header.append($row);
        $altTable.append($header);
        $altTable.append('<tbody/>');

        // Make the main div to hold script content.
        altNamesElement = $('<div/>').attr('id', 'altDiv');
        altNamesElement.append('<button id="altCloseButton" title="Close panel">&times;</button>');
        altNamesElement.append(optionsHTML);
        altNamesElement.append($altTable);
        altNamesElement.appendTo($('#WazeMap'));
        applySavedPosition();
        makeDraggable();
        $('#altOptionsButton').click(function () {
            let $optionsDiv = $('#optionsDiv');
            if ($optionsDiv.css('display') === 'none') {
                $optionsDiv.show();
                $(this).text('Hide Options');
            } else {
                $optionsDiv.hide();
                $(this).text('Show Options');
            }
        });
        $('#altCloseButton').click(async function () {
            panelClosed = true;
            // Record what was selected when the user closed, so a *new* selection
            // is detected and re-opens the panel automatically.
            const sel = await SDK.Editing.getSelection();
            closedSelectionKey = sel && sel.objectType === 'segment'
                ? sel.ids.slice().sort().join(',')
                : null;
            altNamesElement.fadeOut();
            void SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
            primaryFeatures.clear();
        });
        $('#altSortByNode').on('change', () => void checkSelection());
        $('#altHighlights').on('change', () => void checkAllSegments());
        $('#altUseCity').on('change', colorTable);
        $('#altShowCity').on('change', function () {
            if ($(this).prop('checked')) {
                $altTable.find('.altTable-primary-city, .altTable-alt-city').each(function () {
                    $(this).show();
                });
            } else {
                $altTable.find('.altTable-primary-city, .altTable-alt-city').each(function () {
                    $(this).hide();
                });
            }
        });
        $('#optionsDiv input[type=checkbox], #altOptions input[type=checkbox]').on('change', () => void saveOptions());
        altNamesElement.on('mouseenter mouseleave', 'td.altTable-primary, td.altTable-alt', { singleSegment: false }, applyHighlighting);
        altNamesElement.on('dblclick', 'td.altTable-primary, td.altTable-alt', null, changeHighlightColor);
        altNamesElement.on('mouseenter mouseleave', 'td.altTable-id', { singleSegment: true }, applyHighlighting);
        altNamesElement.on('click', 'td.altTable-id', null, function () {
            void panToSegment($(this).text());
        });
        altNamesElement.on('dblclick', 'td.altTable-id', null, function () {
            void selectSegment($(this).text());
        });

        // Make $altDiv resizable (dragging is handled by the drag handle).
        try {
            altNamesElement.one('resize', function () {
                $(this).css('max-height', '100%');
            });
            altNamesElement.resizable({ handles: 'all', containment: 'parent' });
        } catch (err) {
            draggableSupported = false;
        }

        // Create the map layers for segment highlighting.
        await SDK.Map.addLayer({
            layerName: PRIMARY_LAYER,
            styleContext: {
                getBgColor: ({ feature }) => feature?.properties?.bgColor ?? '#FFFFFF',
            },
            styleRules: [
                { style: { stroke: false } },
                {
                    predicate: props => props.isHighlighted === true,
                    style: {
                        stroke: true,
                        strokeColor: '${getBgColor}',
                        strokeWidth: 20,
                        strokeOpacity: 1,
                        strokeLinecap: 'round',
                    },
                },
            ],
        });
        sdkEventSubscriptions.push(SDK.Events.on({ eventName: 'wme-layer-visibility-changed', eventHandler: (e) => {
            if (e?.layerName === PRIMARY_LAYER) void checkSelection();
        }}));

        await SDK.Map.addLayer({
            layerName: HIGHLIGHT_LAYER,
            styleRules: [{
                style: {
                    stroke: true,
                    strokeWidth: 20,
                    strokeColor: '#FFFFFF',
                    strokeOpacity: 0.4,
                },
            }],
        });

        SDK.LayerSwitcher.addLayerCheckbox({ name: LAYER_CHECKBOX_NAME, isChecked: true });
        sdkEventSubscriptions.push(SDK.Events.on({ eventName: 'wme-layer-checkbox-toggled', eventHandler: (e) => {
            if (e?.name === LAYER_CHECKBOX_NAME) void changeLayerVisibility(e.checked);
        }}));

        //register WME event listeners - track subscriptions for cleanup
        sdkEventSubscriptions.push(SDK.Events.on({ eventName: 'wme-selection-changed', eventHandler: () => void checkSelection() }));
        sdkEventSubscriptions.push(SDK.Events.on({ eventName: 'wme-map-move-end', eventHandler: () => void checkAllSegments() }));

        loadOptions();
        checkAllSegments();
        await checkSelection();
    }

    async function changeLayerVisibility(checked) {
        await SDK.Map.setLayerVisibility({ layerName: PRIMARY_LAYER, visibility: checked });
        await SDK.Map.setLayerVisibility({ layerName: HIGHLIGHT_LAYER, visibility: checked });
        if (SDK.LayerSwitcher.isLayerCheckboxChecked({ name: LAYER_CHECKBOX_NAME }) !== checked) {
            SDK.LayerSwitcher.setLayerCheckboxChecked({ name: LAYER_CHECKBOX_NAME, isChecked: checked });
        }
        // Re-enabling the layer clears a previous manual close and re-shows the panel.
        if (checked) {
            panelClosed = false;
            void checkSelection();
        }
        await saveOptions();
    }

    /**
     * Cleanup function to prevent memory leaks on script reload/unload.
     * Unsubscribes from all SDK events, clears DOM elements, and resets global state.
     */
    async function cleanup() {
        // Unsubscribe from all SDK events.
        // SDK.Events.on() returns a cleanup FUNCTION (not an object with .remove()).
        sdkEventSubscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        sdkEventSubscriptions = [];

        // Clear event listeners on DOM elements
        if (altNamesElement) {
            altNamesElement.off();
            altNamesElement.remove();
            altNamesElement = null;
        }

        // Clear jQuery references
        if ($altTable) {
            $altTable.off();
            $altTable = null;
        }

        // Clear data arrays
        nameArray = [];
        selectedSegments = [];
        segmentsWithAlternates = [];
        primaryFeatures.clear();

        // Remove map layers
        if (SDK) {
            try {
                await SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
                await SDK.Map.removeAllFeaturesFromLayer({ layerName: HIGHLIGHT_LAYER });
            } catch (e) {
                console.debug('Error removing features during cleanup:', e);
            }
        }

        isInitialized = false;
    }

    function scriptupdatemonitor() {
    if (WazeWrap?.Ready) {
        // Create and start the ScriptUpdateMonitor
        const updateMonitor = new WazeWrap.Alerts.ScriptUpdateMonitor(
        scriptName,
        scriptVersion,
        downloadUrl,
        GM_xmlhttpRequest
        );
        updateMonitor.start(2, true); // Check every 2 hours, check immediately

        // Show the update dialog for the current version
        WazeWrap.Interface.ShowScriptUpdate(scriptName, scriptVersion, updateMessage, downloadUrl, forumURL);
    } else {
        setTimeout(scriptupdatemonitor, 250);
    }
    }

    async function bootstrap() {
        // Prevent duplicate initialization
        if (isInitialized) {
            console.debug(`${scriptName}: Already initialized, skipping bootstrap`);
            return;
        }

        try {
            // Sync mode is on WME's deprecation path — opt in to async mode now.
            SDK = unsafeWindow.getWmeSdk({
                mode: 'async',
                scriptId: 'WMEShowAltNames',
                scriptName: scriptName,
            });

            if (await SDK.State.isReady()) {
                await init();
                isInitialized = true;
            } else {
                SDK.Events.once({ eventName: 'wme-ready' }).then(async () => {
                    if (!isInitialized) {
                        await init();
                        isInitialized = true;
                    }
                });
            }
        } catch (err) {
            console.error(`${scriptName}: Failed to initialize SDK`, err);
        }
    }

    if (unsafeWindow.SDK_INITIALIZED) {
        unsafeWindow.SDK_INITIALIZED.then(bootstrap).catch((err) => {
            console.error(`${scriptName}: SDK initialization failed`, err);
        });
    } else {
        console.warn(`${scriptName}: SDK_INITIALIZED is undefined`);
    }

    // Start script update monitoring independently
    scriptupdatemonitor();

})();

/*Changelog*/
/*
2026.10.14.08 -
    - Moved the close (×) button to the top-right corner of the panel.
2026.10.14.07 -
    - After closing the panel, selecting a different segment now re-opens it
      automatically (no need to toggle the layer checkbox).
2026.10.14.06 -
    - Reserve room for WME's ~20px bottom footer so the panel is no longer
      covered by it when aligned to the bottom edge.
2026.10.14.05 -
    - Added a close (×) button to the panel so it can be closed manually.
      The panel stays closed until the layer checkbox is toggled back on.
2026.10.14.04 -
    - The panel now re-aligns itself inside the viewport after the table grows
      (e.g. when selecting multiple segments), instead of overflowing the edge.
2026.10.14.03 -
    - Moved the drag handle inline to the left of the "Show Options" button.
    - Fixed duplicated rows when a single segment was selected (overlapping async
      selection refreshes are now guarded).
2026.10.14.02 -
    - Added a drag handle (window icon) to the panel; drag it with the mouse to
      reposition. The position is remembered across page refreshes.
2026.10.14.01 -
    - Migrated to the WME SDK async mode (sync is on the deprecation path).
    - Faster highlighting: uses redrawLayer() with mutable style state instead of
      removing/re-adding features.
    - Replaced the hand-rolled layer checkbox with the native SDK LayerSwitcher.
    - Address lookup now uses Segments.getAddress() (single call), and road type
      labels use Segments.getRoadTypes().
    - Fixed an SDK event-listener leak in cleanup() (Events.on returns a function).
    - Removed dead route auto-select code.
2026.04.16.00 -
    - Initial release after migration to SDK and rewrite.
*/