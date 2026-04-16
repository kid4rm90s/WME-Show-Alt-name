// ==UserScript==
// @name            WME Show Alt Names
// @description     Shows alt names for selected segments
// @version         2026.04.16.01
// @author          The_Cre8r / SAR85 / kid4rm89s
// @copyright       SAR85, The_Cre8r / kid4rm89s
// @license         CC BY-NC-ND
// @grant           unsafeWindow
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @namespace       https://greasyfork.org/users/1087400
// @connect         greasyfork.org
// @grant           GM_xmlhttpRequest
// @require         https://greasyfork.org/scripts/560385/code/WazeToastr.js
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
    const updateMessage = `<strong>✨What's New :</strong><br> - Migrated the script to the WME SDK for improved performance and reliability.<br><br> - Please report any bugs or issues you encounter.`;
    const scriptName = GM_info.script.name;
    const scriptVersion = GM_info.script.version;
    const downloadUrl = 'https://update.greasyfork.org/scripts/574195/WME%20Show%20Alt%20Names.user.js';
    const forumURL = 'https://greasyfork.org/scripts/574195-wme-show-alt-names/feedback';

    const PRIMARY_LAYER = 'WME Show Alt Names';
    const HIGHLIGHT_LAYER = 'WME Show Alt Names Highlight';
    let SDK,
        altNamesElement,
        $altTable,
        segmentsWithAlternates = [],
        primaryFeatures = new Map(),
        draggableSupported = true,
        nameArray = [],
        selectedSegments = [],
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
                'overflow-y': 'scroll',
                'overflow-x': 'hidden',
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
     * Re-adds any highlighted features without highlight to trigger style update.
     */
    function resetHighlight() {
        for (const [segId, feat] of primaryFeatures) {
            if (feat.properties.isHighlighted) {
                SDK.Map.removeFeatureFromLayer({ layerName: PRIMARY_LAYER, featureId: segId });
                const reset = { ...feat, properties: { ...feat.properties, isHighlighted: false } };
                primaryFeatures.set(segId, reset);
                SDK.Map.addFeatureToLayer({ layerName: PRIMARY_LAYER, feature: reset });
            }
        }
    }

    /**
     * Highlights a single feature on the primary layer with the given color.
     * Re-adds the feature with updated properties to trigger style update.
     */
    function highlightFeature(segmentId, color) {
        const feat = primaryFeatures.get(segmentId);
        if (!feat) return;
        SDK.Map.removeFeatureFromLayer({ layerName: PRIMARY_LAYER, featureId: segmentId });
        const updated = { ...feat, properties: { ...feat.properties, bgColor: color, isHighlighted: true } };
        primaryFeatures.set(segmentId, updated);
        SDK.Map.addFeatureToLayer({ layerName: PRIMARY_LAYER, feature: updated });
    }

    /**
     * Pans the map to a segment specified by its ID.
     * @param {Number} id The ID of the segment.
     */
    function panToSegment(id) {
        if (!id) return;
        const segment = SDK.DataModel.Segments.getById({ segmentId: id });
        if (!segment) return;
        const coords = segment.geometry.coordinates;
        const lons = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        SDK.Map.setMapCenter({
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
    function selectSegment(id) {
        if (!id) return;
        SDK.Editing.setSelection({
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
     * Lookup function for the display color of a specified road type. Will
     * return the color for the experimental layer if it is activated,
     * otherwise it will return the color for the old roads layer.
     * @param {Number} type The roadType to look up.
     * @returns {Object} Object of form:
     * {typeString: 'RoadTypeName', typeColor: '#FFFFFF'},
     * where RoadTypeName is an abbreviated form of the name of the road type
     * and typeColor is the hex value of the display color.
     */
    function getRoadColor(type) {
        if (type && ROAD_TYPES[type] !== undefined) {
            return {
                typeString: ROAD_TYPES[type].name,
                typeColor: ROAD_TYPES[type].expColor,
            };
        } else {
            return { typeString: 'error', typeColor: ROAD_TYPES[1].expColor };
        }
    }

    /**
     * Data structure for segment information used to build highlight layer
     * features and the alternate names table.
     * @class
     * @param {Waze.Feature.Vector.Segment} The segment feature on which to
     * base the new instance.
     */
    function SegmentWithAlternate(sdkSegment) {
        if (!sdkSegment) return;

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

        // Store segment name information.
        let streetObject = SDK.DataModel.Streets.getById({ streetId: sdkSegment.primaryStreetId });
        let cityObject = streetObject && SDK.DataModel.Cities.getById({ cityId: streetObject.cityId });
        this.primaryName = streetObject ? streetObject.name || 'No name' : 'New road';
        this.primaryCity = cityObject ? cityObject.name || 'No city' : 'New road';

        this.alternates = [];
        for (let i = 0; i < sdkSegment.alternateStreetIds.length; i++) {
            streetObject = SDK.DataModel.Streets.getById({ streetId: sdkSegment.alternateStreetIds[i] });
            cityObject = streetObject && SDK.DataModel.Cities.getById({ cityId: streetObject.cityId });
            this.alternates.push({
                name: streetObject ? streetObject.name || 'No name' : 'New road',
                city: cityObject ? cityObject.name || 'No city' : 'New road',
            });
        }

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

        // Make a table row for displaying segment data.
        this.tableRow = this.createTableRow();
    }
    SegmentWithAlternate.prototype = /** @lends Alternate.prototype */ {
        createTableRow: function () {
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
        },
    };

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
    function colorFeatures($el, color) {
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
    function colorSegment(id, color) {
        'use strict';
        let i, n, feature;
        color = color || 'rgba(0, 0, 0, 0.8)';
        highlightFeature(id, color);
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
                    colorSegment($this1.text());
                    $this1.parent().addClass('altTable-selected');
                } else {
                    colorFeatures($this1, $this1.css('background-color'));
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
                resetHighlight();
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
    function checkSelection() {
        if (!SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER })) {
            return;
        }

        let nameColumnsCount = 0;
        selectedSegments = [];
        //$('#altAutoSelect').hide(); // Auto-select route feature removed (WazeWrap routing unavailable)

        const sdkSel = SDK.Editing.getSelection();
        if (!sdkSel || sdkSel.objectType !== 'segment') {
            altNamesElement.fadeOut();
            SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
            primaryFeatures.clear();
            segmentsWithAlternates = [];
            return;
        }

        const selectedIds = sdkSel.ids;
        // Auto-select button hidden — routing feature unavailable without WazeWrap

        SDK.Map.removeAllFeaturesFromLayer({ layerName: PRIMARY_LAYER });
        primaryFeatures.clear();

        for (const segmentId of selectedIds) {
            const sdkSegment = SDK.DataModel.Segments.getById({ segmentId });
            if (!sdkSegment) continue;

            let segmentWithAlternates = new SegmentWithAlternate(sdkSegment);
            segmentsWithAlternates.push(segmentWithAlternates);
            selectedSegments.push(segmentWithAlternates);
            primaryFeatures.set(segmentId, segmentWithAlternates.sdkFeature);
            SDK.Map.addFeatureToLayer({ layerName: PRIMARY_LAYER, feature: segmentWithAlternates.sdkFeature });

            if (segmentWithAlternates.alternates.length >= nameColumnsCount) {
                nameColumnsCount = segmentWithAlternates.alternates.length;
                selectedSegments.namesColumnCount = nameColumnsCount;
            }
        }

        populateTable(nameColumnsCount, $('#altSortByNode').prop('checked'));
        altNamesElement.fadeIn();
    }

    /**
     * Checks all segments in WME for alt names and adds feature for
     * highlighting.
     */
    function checkAllSegments() {
        SDK.Map.removeAllFeaturesFromLayer({ layerName: HIGHLIGHT_LAYER });
        if (!SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER }) || !$('#altHighlights').prop('checked')) {
            return;
        }

        const highlightFeatures = SDK.DataModel.Segments.getAll()
            .filter(seg => seg.alternateStreetIds?.length > 0)
            .map(seg => ({
                id: seg.id,
                type: 'Feature',
                geometry: seg.geometry,
                properties: {},
            }));
        if (highlightFeatures.length > 0) {
            SDK.Map.addFeaturesToLayer({ layerName: HIGHLIGHT_LAYER, features: highlightFeatures });
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

    /**
     * Auto-select route segments between selected endpoints.
     * NOTE: WazeWrap.Model.RouteSelection removed — no SDK equivalent available.
     */
    function performAutoSelect() {
        console.warn(`${scriptName}: Auto-select route feature is unavailable (WazeWrap routing removed).`);
    }

    function saveOptions() {
        let options = {
            fastest: $('#altFastest').prop('checked'),
            tolls: $('#altAvoidTolls').prop('checked'),
            freeways: $('#altAvoidFreeways').prop('checked'),
            dirt: $('#altAvoidDirt').prop('checked'),
            longtrails: $('#altAvoidLongDirt').prop('checked'),
            uturns: $('#altAllowUturns').prop('checked'),
            highlights: $('#altHighlights').prop('checked'),
            sortByNode: $('#altSortByNode').prop('checked'),
            useCity: $('#altUseCity').prop('checked'),
            showCity: $('#altShowCity').prop('checked'),
            layerToggle: SDK.Map.isLayerVisible({ layerName: PRIMARY_LAYER }),
        };
        return (window.localStorage.altNamesOptions = JSON.stringify(options));
    }

    function loadOptions() {
        let options = JSON.parse(window.localStorage.altNamesOptions ?? '{}');
        $('#altFastest').prop('checked', options?.fastest ?? false);
        $('#altAvoidTolls').prop('checked', options?.tolls ?? false);
        $('#altAvoidFreeways').prop('checked', options?.freeways ?? false);
        $('#altAvoidDirt').prop('checked', options?.dirt ?? false);
        $('#altAvoidDirt').prop('checked', options?.longtrails ?? false);
        $('#altAllowUturns').prop('checked', options?.uturns ?? false);
        $('#altHighlights').prop('checked', options?.highlights ?? false);
        $('#altSortByNode').prop('checked', options?.sortByNode ?? false);
        $('#altUseCity').prop('checked', options?.useCity ?? false);
        $('#altShowCity').prop('checked', options?.showCity ?? false);
        changeLayerVisibility(options?.layerToggle ?? true);
    }

    /**
     * Initializes the script by adding CSS and HTML to page, registering event
     * listeners, adding map layers and running main
     * functions to check for segments loaded at init and highlighting.
     */
    function init() {
        let css, $header, optionsHTML, $row;

        css = '#altTable {width: 100%;}';
        css += '.altTable, .altTable th, .altTable td {border: 1px solid white; padding: 3px; border-collapse: collapse; -moz-user-select: -moz-none; -khtml-user-select: none; -webkit-user-select: none;}\n';
        css += '.altTable-type {width: 50px;}\n';
        css += '.altTable-id {text-align: center; border-left: none; width: 80px}\n';
        css +=
            '.altTable-roadType {border-radius: 10px; color: black; text-shadow: 1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,0px 1px 0 #fff,1px 0px 0 #fff,0px -1px 0 #fff,-1px 0px 0 #fff; border: 1px solid white; font-size: 0.8em; text-align: center; padding: 0 3px 0 3px; min-width: 32px;}';
        css += 'tr.altTable-selected > .altTable-id {font-weight: bold; background-color: white; color: black;}\n';

        css += '#altDiv {display: none; position: absolute; left: 6px; bottom: 60px; min-height: 120px; min-width: 335px;';
        css += 'overflow-y: scroll; overflow-x: hidden; white-space: nowrap; background-color: rgba(0,0,0,0.8); color: white; padding: 5px; ';
        css += 'z-index: 1001; border-radius: 5px; max-height: 60%;}\n';

        // scroll bar CSS
        css += '#altDiv::-webkit-scrollbar {width: 15px; border-radius: 5px;}\n';
        css += '#altDiv::-webkit-scrollbar-track {border-radius: 5px; background: none; width: 10px;}\n';
        css += '#altDiv::-webkit-scrollbar-thumb {background-color: white; border-radius: 5px; border: 2px solid black;}\n';
        css += '#altDiv::-webkit-scrollbar-corner {background: none;}\n';

        // buttons css
        css += '.altOptions-button {margin: 0 0 3px 3px; height: 2em; font-size: 0.8em;}\n';

        // Options Menu CSS
        css += '#optionsDiv {display: none; clear: both; border: 1px solid white; padding: 3px; margin: 0 0 3px 0; font-weight: normal;}';
        css += '#optionsDiv td {padding-right: 5px;}';
        css += '#optionsDiv input {margin-right: 3px;}';

        //add css to page
        $('<style/>').html(css).appendTo($(document.head));

        // Make the options menu.
        optionsHTML =
            '<div id="altOptions"> <button id="altAutoSelect" class="altOptions-button" style="display: none;">Auto Select</button> <label style="float: right; margin: 3px;"> <input id="altHighlights" type="checkbox">Highlight Alt Names</label> <button id="altOptionsButton" class="altOptions-button" style="float: right;">Show Options</button> </div> <div id="optionsDiv"> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altShowCity">Show city name in table</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altUseCity">Use city name in name matching</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altSortByNode">Sort table by driving order (experimental)</label> </div> <form> <table> <thead> <tr> <td colspan="2" style="text-align: center; text-decoration: underline; font-weight: bold;">Auto Selection Route Options</td> </tr> </thead> <tbody> <tr> <td> <input type="checkbox" id="altAvoidTolls">Avoid toll roads</td> <td> <input type="checkbox" id="altAvoidFreeways">Avoid freeways</td> </tr> <tr> <td> <input type="checkbox" id="altAvoidLongDirt">Avoid long dirt roads</td> <td> <input type="checkbox" id="altAvoidDirt">Avoid dirt roads</td> </tr> <tr> <td> <input type="checkbox" id="altAllowUturns">Allow U-turns</td> <td> <input type="checkbox" id="altFastest">Fastest route</td> </tr> </tbody> </table> </form> </div>';
        //optionsHTML = '<div id="altOptions"><label style="float: left; margin: 3px;"> <input id="altHighlights" type="checkbox">Highlight Alt Names</label> <button id="altOptionsButton" class="altOptions-button" style="float: left;">Show Options</button> </div> <div id="optionsDiv"> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altShowCity">Show city name in table</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altUseCity">Use city name in name matching</label> </div> <div> <label style="font-weight: normal;"> <input type="checkbox" id="altSortByNode">Sort table by driving order (experimental)</label> </div> </div>';

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
        altNamesElement.append(optionsHTML);
        altNamesElement.append($altTable);
        altNamesElement.appendTo($('#WazeMap'));
        $('#altAutoSelect').click(performAutoSelect);
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
        $('#altSortByNode').on('change', checkSelection);
        $('#altHighlights').on('change', checkAllSegments);
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
        $('#optionsDiv input[type=checkbox], #altOptions input[type=checkbox]').on('change', saveOptions);
        altNamesElement.on('mouseenter mouseleave', 'td.altTable-primary, td.altTable-alt', { singleSegment: false }, applyHighlighting);
        altNamesElement.on('dblclick', 'td.altTable-primary, td.altTable-alt', null, changeHighlightColor);
        altNamesElement.on('mouseenter mouseleave', 'td.altTable-id', { singleSegment: true }, applyHighlighting);
        altNamesElement.on('click', 'td.altTable-id', null, function () {
            panToSegment($(this).text());
        });
        altNamesElement.on('dblclick', 'td.altTable-id', null, function () {
            selectSegment($(this).text());
        });

        // Make $altDiv resizable and draggable
        try {
            altNamesElement.one('resize', function () {
                $(this).css('max-height', '100%');
            });
            altNamesElement.resizable({ handles: 'all', containment: 'parent' });
            altNamesElement.one('drag', function () {
                $(this).css('bottom', 'auto');
            });

            altNamesElement.draggable({ containment: 'parent' });
        } catch (err) {
            draggableSupported = false;
        }

        // Create the map layers for segment highlighting.
        SDK.Map.addLayer({
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
        SDK.Events.on({ eventName: 'wme-layer-visibility-changed', eventHandler: (e) => {
            if (e?.layerName === PRIMARY_LAYER) checkSelection();
        }});

        SDK.Map.addLayer({
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

        AddLayerCheckbox('Scripts', 'Show Alt Names', true, changeLayerVisibility, null);

        //register WME event listeners
        SDK.Events.on({ eventName: 'wme-selection-changed', eventHandler: checkSelection });
        SDK.Events.on({ eventName: 'wme-map-move-end', eventHandler: checkAllSegments });
        SDK.Events.on({ eventName: 'wme-map-zoom-changed', eventHandler: checkAllSegments });

        loadOptions();
        checkAllSegments();
        checkSelection();
    }

    function changeLayerVisibility(checked) {
        SDK.Map.setLayerVisibility({ layerName: PRIMARY_LAYER, visibility: checked });
        SDK.Map.setLayerVisibility({ layerName: HIGHLIGHT_LAYER, visibility: checked });
        saveOptions();
    }

    function AddLayerCheckbox(group, checkboxText, checked, callback) {
        group = group.toLowerCase();
        let normalizedText = checkboxText.toLowerCase().replace(/\s/g, '_');
        let checkboxID = 'layer-switcher-item_' + normalizedText;
        let groupPrefix = 'layer-switcher-group_';
        let groupClass = groupPrefix + group.toLowerCase();
        sessionStorage[normalizedText] = checked;

        let CreateParentGroup = function (groupChecked) {
            let groupList = $('.layer-switcher').find('.list-unstyled.togglers');
            let checkboxText = group.charAt(0).toUpperCase() + group.substr(1);
            let newLI = $('<li class="group">');
            newLI.html(
                [
                    '<div class="layer-switcher-toggler-tree-category">',
                    // '<wz-button color="clear-icon" size="xs">',
                    // '<i class="toggle-category w-icon w-icon-caret-down"></i>',
                    // '</wz-button>',
                    '<wz-toggle-switch disabled="false" class="' + groupClass + '" id="' + groupClass + '" ' + (groupChecked ? 'checked' : '') + ' name value>',
                    '</wz-toggle-switch>',
                    '<label class="label-text" for="' + groupClass + '">' + checkboxText + '</label>',
                    '</div>',
                    '<ul class="collapsible-GROUP_' + group.toUpperCase() + '"></ul>',
                    '</li>',
                ].join(' ')
            );

            groupList.append(newLI);
            $('#' + groupClass).change(function () {
                sessionStorage[groupClass] = this.checked;
            });
        };

        if (group !== 'issues' && group !== 'places' && group !== 'road' && group !== 'display')
            if ($('.' + groupClass).length === 0) {
                //"non-standard" group, check its existence
                //Group doesn't exist yet, create it
                let isParentChecked = typeof sessionStorage[groupClass] == 'undefined' ? true : sessionStorage[groupClass] == 'true';
                CreateParentGroup(isParentChecked); //create the group
                sessionStorage[groupClass] = isParentChecked;
            }

        let buildLayerItem = function (isChecked) {
            let groupChildren = $('.collapsible-GROUP_' + group.toUpperCase());
            let $li = $('<li>');
            $li.html(['<wz-checkbox id="' + checkboxID + '" class="hydrated">', checkboxText, '</wz-checkbox>'].join(' '));

            groupChildren.append($li);
            $('#' + checkboxID).prop('checked', isChecked);
            $('#' + checkboxID).change(function () {
                callback(this.checked);
                sessionStorage[normalizedText] = this.checked;
            });
            if (!$('#' + groupClass).prop('checked')) {
                $('#' + checkboxID).prop('disabled', true);
                callback(false);
            }

            $('#' + groupClass).change(function () {
                $('#' + checkboxID).prop('disabled', !this.checked);
                callback(!this.checked ? false : sessionStorage[normalizedText] == 'true');
            });
        };

        buildLayerItem(checked);
    }

    function scriptupdatemonitor() {
    if (WazeToastr?.Ready) {
        // Create and start the ScriptUpdateMonitor
        const updateMonitor = new WazeToastr.Alerts.ScriptUpdateMonitor(
        scriptName,
        scriptVersion,
        downloadUrl,
        GM_xmlhttpRequest
        );
        updateMonitor.start(2, true); // Check every 2 hours, check immediately

        // Show the update dialog for the current version
        WazeToastr.Interface.ShowScriptUpdate(scriptName, scriptVersion, updateMessage, downloadUrl, forumURL);
    } else {
        setTimeout(scriptupdatemonitor, 250);
    }
    }

    function bootstrap() {
        try {
            SDK = unsafeWindow.getWmeSdk({
                scriptId: 'WMEShowAltNames',
                scriptName: scriptName,
            });

            if (SDK.State.isReady()) {
                init();
            } else {
                SDK.Events.once({ eventName: 'wme-ready' }).then(init);
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
