// D3 FUNCTIES DIE WE IN DE VISUALISATIE GEBRUIKEN

const {
  select,
  csv,
  extent,
  scaleTime,
  scaleBand,
  axisBottom,
  axisLeft,
  timeFormat,
  scaleOrdinal,
  schemeCategory10,
  ascending,
  zoom
} = d3;


 // SVG EN AFMETINGEN VAN DE VISUALISATIE

// Het SVG element uit onze HTML selecteren
const svg = select('.chartArea svg');


// vaste breedte van de grafiek, gelijk aan improved D3.js
const width = 960;


// De beschikbare hoogte van het scherm gebruiken
const height = Math.max(
  300,
  window.innerHeight - 24
);


// De afmetingen van het SVG element instellen
svg
  .attr('width', width)
  .attr('height', height);

// Marges rondom de grafiek
const margin = {
  top: 50,
  right: 40,
  bottom: 70,
  left: 120
};

// Effectieve breedte en hoogte van het tekengebied
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;


// DATA INLADEN EN VOORBEREIDEN

csv('data_sample_1000.csv').then((data) => {

  // Timestamps uit de CSV omzetten naar JavaScript datums
  data.forEach((d) => {
    d.timestamp = new Date(d.timestamp.replace(' ', 'T'));
  });

  // Events met een ongeldige timestamp niet gebruiken
  const validData = data.filter((d) => {
    return !Number.isNaN(d.timestamp.getTime());
  });

  if (!validData.length) {
    throw new Error('No valid timestamps in CSV.');
  }


  // INFORMATIE PER CASE BEREKENEN

  // Per case bewaren we de eerste timestamp, de laatste timestamp
  // en het aantal events. Deze informatie gebruiken we bij het sorteren.
  const caseInfo = new Map();

  validData.forEach((d) => {
    const caseName = d.CASE_concept_name;

    // De case toevoegen wanneer we deze voor het eerst tegenkomen
    if (!caseInfo.has(caseName)) {
      caseInfo.set(caseName, {
        start: d.timestamp,
        end: d.timestamp,
        eventCount: 0
      });
    }

    const info = caseInfo.get(caseName);

    // Aantal events van deze case verhogen
    info.eventCount += 1;

    // Eerste eventtijdstip bepalen
    if (d.timestamp < info.start) {
      info.start = d.timestamp;
    }

    // Laatste eventtijdstip bepalen
    if (d.timestamp > info.end) {
      info.end = d.timestamp;
    }
  });

  // TIJDSINTERVALLEN PER CASE BEREKENEN
  const eventsByCase = new Map();

  validData.forEach((d) => {
    const caseName = d.CASE_concept_name;

    // een lege lijst maken wanneer de case voor het eerst voorkomt
    if (!eventsByCase.has(caseName)) {
      eventsByCase.set(caseName, []);
    }

    // event toevoegen aan de juiste case
    eventsByCase.get(caseName).push(d);
  });

  // voor iedere case de intervallen berekene
  eventsByCase.forEach((events,caseName) => {

    // chronologisch sorteren
    events.sort((a,b) => ascending (a.timestamp, b.timestamp));

    // alle intervallen tussen opeenvolgende events bewaren
    const intervals = [];

    // tijdsverschil berekenen tussen opeenvolgende events
    for (let i = 1; i < events.length; i++) {
      const interval =
        events[i].timestamp - events[i-1].timestamp;
      
      intervals.push(interval);
    }

    // bestaande case informatie ophalen
    const info = caseInfo.get(caseName);

    if (intervals.length > 0) {
      info.avgInterval = d3.mean(intervals);
      info.minInterval = d3.min(intervals);
      info.maxInterval = d3.max(intervals);
    }

    else {
      info.avgInterval = null;
      info.minInterval = null;
      info.maxInterval = null;
    }
  });


  // CASES, ACTIVITEITEN EN KLEUREN

  // Alle unieke cases verzamelen
  const cases = Array.from(caseInfo.keys());

  // Bepalen welke velden de case en de activiteit voorstellen
  const yValue = (d) => d.CASE_concept_name;
  const activityValue = (d) => d.activity_id;

  // Alle unieke activiteiten verzamelen
  const activities = Array.from(
    new Set(validData.map(activityValue))
  );

  // Elke activiteit een vaste kleur geven
  const colorScale = scaleOrdinal()
    .domain(activities)
    .range(schemeCategory10);

  // CASE OVERVIEW

  // statisch overzicht maken
  const caseOverview = select('#caseOverviewContent');

  const formatInterval = (milliseconds) => {
    if (milliseconds === null || milliseconds === undefined) {
      return 'N/A';
    }

    const days = milliseconds / (1000 * 60 * 60 * 24);
    return days.toFixed(2) + ' days';
  };

  // TIMESTAMPS FORMATTEREN
  const formatTimestamp = timeFormat('%d/%m/%Y %H:%M');

  // CASES WEERGEVEN
  const caseItems = caseOverview
    .selectAll('.caseOverviewItem')
    .data(cases)
    .enter()
    .append('div')
    .attr('class', 'caseOverviewItem');

  // CASE ID
  caseItems
    .append('div')
    .attr('class', 'caseOverviewId')
    .text((caseName) => 'Case ' + caseName);
  
  // NUMBER OF DOTS
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Number of dots: ' + info.eventCount;
    });
  
  // TIME (FIRST)
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Time (first): ' + formatTimestamp(info.start);
    });

  // TIME (LAST)
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Time (last): ' + formatTimestamp(info.end);
    });

  // AVERAGE INTERVAL
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Average interval: ' + formatInterval(info.avgInterval);
    })

  // MINIMUM INTERVAL
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Minimum interval: ' + formatInterval(info.minInterval);
    });

  // MAXIMUM INTERVAL
  caseItems
    .append('div')
    .attr('class', 'caseOverviewStat')
    .text((caseName) => {
      const info = caseInfo.get(caseName);
      return 'Maximum interval: ' + formatInterval(info.maxInterval);
    });
  
  // ACTIVITEITENLEGENDE
  const legend = select('#activityLegend');

  const legendItems = legend
    .selectAll('.legendItem')
    .data(activities)
    .enter()
    .append('div')
    .attr('class', 'legendItem');

  legendItems
    .append('span')
    .attr('class', 'legendDot')
    .style('background-color', (d) => colorScale(d))

  legendItems
    .append('span')
    .attr('class', 'legendLabel')
    .text((d) => d);


  // X-AS: TIJDWEERGAVE

  // We beginnen met de absolute tijdweergave
  let timeMode = 'absolute';

  // Bepalen welke tijdwaarde op de X-as moet worden gebruikt
  const xValue = (d) => {

    if (timeMode === 'relative') {
      const caseStart = caseInfo.get(yValue(d)).start;
      const elapsedTime = d.timestamp - caseStart;

      return new Date(elapsedTime);
    }

    return d.timestamp;
  };

  // Het vroegste en laatste tijdstip in de huidige tijdweergave
  const xDomain = extent(validData, xValue);

  // Schaal voor de X-as
  const xScale = scaleTime()
    .domain(xDomain)
    .range([0, innerWidth]);


  // Y-AS: CASES SORTEREN

  // De cases sorteren volgens het geselecteerde criterium
  const sortCases = (sortType, direction = 'ascending') => {

    const multiplier = direction === 'descending' ? -1 : 1;

    return [...cases].sort((caseA, caseB) => {
      const infoA = caseInfo.get(caseA);
      const infoB = caseInfo.get(caseB);

      let comparison = 0;

      // Cases sorteren op hun unieke ID
      if (sortType == 'caseID') {

        comparison = String(caseA).localeCompare(
          String(caseB),
          undefined,
          {numeric: true}
        );
      }

      // Sorteren op doorlooptijd van een case
      else if (sortType === 'duration') {
        const durationA = infoA.end - infoA.start;
        const durationB = infoB.end - infoB.start;

        comparison = ascending(durationA, durationB);
      }

      // Sorteren op het aantal events per case
      else if (sortType === 'eventCount') {
        comparison = ascending(
          infoA.eventCount,
          infoB.eventCount
        );
      }

      // Sorteren op het starttijdstip van de case
      else if (sortType === 'startTime') {
        comparison = ascending(infoA.start, infoB.start);
      }

      // Sorteren op het laatste tijdstip
      else if (sortType === 'endTime') {
        comparison = ascending(infoA.end, infoB.end);
      }

      // Bij gelijke waarden eerst vergelijken op starttijdstip
      if (comparison === 0) {
        comparison = ascending(infoA.start, infoB.start);
      }

      // Bij een tweede gelijke waarde sorteren op case ID
      if (comparison === 0) {
        comparison = String(caseA).localeCompare(
          String(caseB),
          undefined,
          { numeric: true }
        );
      }

      return comparison * multiplier;
    });
  };

  // Schaal voor de cases op de Y-as
  const yScale = scaleBand()
    .domain(sortCases('startTime'))
    .range([0, innerHeight]);


  // HOOFDGROEP EN TEKENGEBIED

  // Groep waarin we de grafiek tekenen, rekening houdend met de marges
  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Alles buiten het tekengebied afsnijden tijdens het zoomen
  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'plotClip')
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight);

  const plotGroup = g
    .append('g')
    .attr('clip-path', 'url(#plotClip)');

  // Transparante achtergrond waarop de zoominteractie werkt
  plotGroup
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('fill', 'transparent');


  // X-AS EN Y-AS TEKENEN

  // Labels op de X-as aanpassen aan de gekozen tijdweergave
  const getTimeTickFormat = () => {

    if (timeMode === 'relative') {
      return (d) => {
        const days = d.getTime() / (1000 * 60 * 60 * 24);
        return days.toFixed(0) + ' d';
      };
    }

    return timeFormat('%b %Y');
  };

  // X-as onderaan de grafiek tekenen
  const xAxisGroup = g
    .append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      axisBottom(xScale).tickFormat(getTimeTickFormat())
    );

  // Y-as tekenen, zonder alle 1000 case labels tegelijk te tonen
  const yAxisGroup = g
    .append('g')
    .call(
      axisLeft(yScale).tickValues([])
    );

  // De verticale aslijn beperken tot de hoogte van de grafiek
  const updateYAxisLine = () => {
    yAxisGroup
      .select('.domain')
      .attr('d', `M0.5,0V${innerHeight}`);
  };

  updateYAxisLine();


  // EVENTS ALS GEKLEURDE DOTS TEKENEN

  const circles = plotGroup
    .selectAll('.eventCircle')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'eventCircle')
    .attr('cx', (d) => xScale(xValue(d)))
    .attr('cy', (d) => {
      return yScale(yValue(d)) + yScale.bandwidth() / 2;
    })
    .attr('r', 2)
    .attr('fill', (d) => colorScale(activityValue(d)));


  // OVERVIEW: KLEIN NAVIGATIEVENSTER

  // Afmetingen en positie van de minimap
  const overviewWidth = innerWidth * 0.24;
  const overviewHeight = innerHeight * 0.18;

  const overviewX = innerWidth * 0.74;
  const overviewY = 10;

  // Groep voor het navigatievenster
  const overviewGroup = g
    .append('g')
    .attr('transform', `translate(${overviewX},${overviewY})`)
    .style('pointer-events', 'none');

  // Witte achtergrond met rand
  overviewGroup
    .append('rect')
    .attr('width', overviewWidth)
    .attr('height', overviewHeight)
    .attr('fill', 'white')
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#666');

  // Aparte schalen voor de kleinere grafiek
  const overviewXScale = scaleTime()
    .domain(xScale.domain())
    .range([0, overviewWidth]);

  const overviewYScale = scaleBand()
    .domain(yScale.domain())
    .range([0, overviewHeight]);

  // Alle events ook in de minimap tekenen
  const overviewCircles = overviewGroup
    .selectAll('.overviewCircle')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'overviewCircle')
    .attr('cx', (d) => overviewXScale(xValue(d)))
    .attr('cy', (d) => {
      return overviewYScale(yValue(d)) + overviewYScale.bandwidth() / 2;
    })
    .attr('r', 0.7)
    .attr('fill', (d) => colorScale(activityValue(d)))
    .attr('opacity', 0.6);

  // Rechthoek die aangeeft welk deel van de grafiek zichtbaar is
  const viewport = overviewGroup
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', overviewWidth)
    .attr('height', overviewHeight)
    .attr('fill', 'white')
    .attr('fill-opacity', 0.08)
    .attr('stroke', '#222')
    .attr('stroke-width', 2);


  // ZOOM: CASE LABELS TONEN WANNEER ZE LEESBAAR ZIJN

  const getZoomCaseLabels = (zoomedYScale) => {

    // Alleen labels tonen wanneer de rijen voldoende hoog zijn
    if (zoomedYScale.bandwidth() < 10) {
      return [];
    }

    // Alleen cases selecteren die binnen het zichtbare gebied liggen
    return zoomedYScale.domain().filter((caseName) => {
      const y = zoomedYScale(caseName) + zoomedYScale.bandwidth() / 2;
      return y >= 0 && y <= innerHeight;
    });
  };


  // ZOOMGEDRAG VAN DE GRAFIEK

  // zoomfactoren bijhouden
  let zoomX = 1;
  let zoomY = 1;

  let offsetX = 0;
  let offsetY = 0;

  const maximumZoom = 20;

  let mouseMode = 'drag';

  // PAN POSITIE BEGRENZEN

  // voorkomen dat de gebruiker buiten tekengebied navigeert
  const constrainPan = () => {
    const minimumX = innerWidth * (1 - zoomX);

    offsetX = Math.max(minimumX, Math.min(0, offsetX));

    const minimumY = innerHeight * (1 - zoomY);

    offsetY = Math.max(minimumY, Math.min(0, offsetY));
  };

  // De grafiek, assen en minimap bijwerken

  const updateZoomView = () => {
    // eerst controleren of de verschuiving binnen de grenzen valt
    constrainPan();

    // horizontale schaal
    const zoomXScale = xScale
      .copy()
      .range([offsetX,offsetX + innerWidth * zoomX]);

    // verticale schaal
    const zoomYScale = yScale
      .copy()
      .range([offsetY, offsetY + innerHeight * zoomY]);

    // events opnieuw positioneren
    circles
      .attr('cx', (d) => zoomXScale(xValue(d)))
      .attr('cy', (d) => zoomYScale(yValue(d)) + zoomYScale.bandwidth() / 2);
    
    // grootte van de dots aanpassen aan de zoom
    const zoomFactor = Math.max(zoomX, zoomY);

    const newRadius = Math.min(
      4.5,
      2 + Math.log2(zoomFactor)*0.5
    );

    circles.attr('r', newRadius);

    // X-AS BIJWERKEN

    // Tijdsas aanpassen aan de huidige zoomfactor
    xAxisGroup.call(
      axisBottom(zoomXScale)
        .tickFormat(getTimeTickFormat())
    );


    // Y-AS BIJWERKEN

    // Alleen caselabels tonen wanneer er
    // voldoende ruimte tussen de cases is
    const visibleLabels = getZoomCaseLabels(
      zoomYScale
    );


    // De verticale as opnieuw tekenen
    yAxisGroup.call(
      axisLeft(zoomYScale)
        .tickValues(visibleLabels)
    );

    // MINIMAP BIJWERKEN

    // bepalen welk gedeelte van de volledige grafiek zichtbaar is
    const viewportX =
      (-offsetX / (innerWidth * zoomX)) * overviewWidth;
    
    const viewportY =
      (-offsetY / (innerHeight * zoomY)) * overviewHeight;
    
    // breedte en hoogte van zichtbare gebied
    const viewportWidth = overviewWidth / zoomX;
    const viewportHeight = overviewHeight / zoomY;

    // kader in de minimap aanpassen
    viewport
      .attr('x', viewportX)
      .attr('y', viewportY)
      .attr('width',viewportWidth)
      .attr('height',viewportHeight);

  };

  // MOUSE MODE: DRAG

  // transparant interactiegebied maken bovenop de grafiek
  const interactionArea = plotGroup
    .append('rect')
    .attr('class', 'interactionArea')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('fill', 'transparent')
    .style('pointer-events', 'all');
  
  // SELECT MODE: SELECTION RECTANGLE

  // een rechthoek maken waarmee de gebruiker een gebied kan selecteren
  const selectionRectangle = plotGroup
    .append('rect')
    .attr('class', 'selectionRectangle')
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.15)
    .attr('stroke', 'steelblue')
    .attr('stroke-dasharray', '4.4')
    .style('pointer-events', 'none')
    .style('display', 'none');
  
  // beginpositie van de selectie bijhouden
  let selectionStartX = 0;
  let selectionStartY = 0;

  // MOUSE INTERACTION: DRAG AND SELECT
  // het gedrag van de muis hangt af van de mode
  const dragBehavior = d3.drag()
    .on('start', function() {

      // beginpositie bewaren bij select
      if (mouseMode === 'select') {
        const mousePosition = d3.mouse(
          interactionArea.node()
        );

        selectionStartX = Math.max(0, 
          Math.min(innerWidth, mousePosition[0]));
        selectionStartY = Math.max(0, 
          Math.min(innerHeight, mousePosition[1]));
        
        // selectierechthoek zichtbaar maken
        selectionRectangle
          .attr('x', selectionStartX)
          .attr('y', selectionStartY)
          .attr('width', 0)
          .attr('height', 0)
          .style('display', null);
      }
    })

    // tijdens het slepen van de muis
    .on('drag', function() {
      
      // de grafiek verschuiven met de muis
      if (mouseMode === 'drag') {
        offsetX += d3.event.dx;
        offsetY += d3.event.dy;

        updateZoomView();
      }

      // SELECT MODE: selectierechthoek aanpassen
      else if (mouseMode === 'select') {

        const mousePosition = d3.mouse(
          interactionArea.node()
        );

        // huidige muispositie begrenzen
        const currentX = Math.max(0,
          Math.min(innerWidth, mousePosition[0])
        );

        const currentY = Math.max(0,
          Math.min(innerHeight, mousePosition[1])
        );

        // linkerbovenhoek van de selectie bepalen
        const rectangleX = Math.min(selectionStartX, currentX);
        const rectangleY = Math.min(selectionStartY, currentY);

        // breedte en hoogte van de selectie bepalen
        const rectangleWidth = Math.abs(currentX - selectionStartX);
        const rectangleHeight = Math.abs(currentY - selectionStartY);

        // selectierechthoek bijwerken
        selectionRectangle
          .attr('x', rectangleX)
          .attr('y', rectangleY)
          .attr('width', rectangleWidth)
          .attr('height', rectangleHeight);
      }
    })

    // einde van de muisinteractie
    .on('end', function() {
      
      // alleen in select mode inzoomen
      if (mouseMode !== 'select') {
        return;
      }

      // afmetingen van de geselecteerde rechthoek
      const rectangleX = Number(selectionRectangle.attr('x'));
      const rectangleY = Number(selectionRectangle.attr('y'));
      const rectangleWidth = Number(selectionRectangle.attr('width'));
      const rectangleHeight = Number(selectionRectangle.attr('height'));

      // selectierechthoek opnieuw verbergen
      selectionRectangle.style('display', 'none');

      // te kleine selecties negeren
      if (rectangleWidth < 8 || rectangleHeight < 8) {
        return;
      }

      // middelpunt van de selectie
      const selectionCenterX = rectangleX + rectangleWidth / 2;
      const selectionCenterY = rectangleY + rectangleHeight / 2;

      // positie van het geselecteerde middelpunt binnen oorspr grafiek
      const originalCenterX = (selectionCenterX - offsetX) / zoomX;
      const originalCenterY = (selectionCenterY - offsetY) / zoomY;

      // NIEUWE ZOOMFACTOREN
      const newZoomX = zoomX * (innerWidth / rectangleWidth);
      const newZoomY = zoomY * (innerHeight / rectangleHeight);

      // maximale zoomfactor respecteren
      zoomX = Math.min(maximumZoom, newZoomX);
      zoomY = Math.min(maximumZoom, newZoomY);

      // NIEUWE POSITIE VAN DE GRAFIEK
      // het midden van de selectie verplaatsen naar midden tekengebied
      offsetX = innerWidth / 2 - originalCenterX * zoomX;
      offsetY = innerHeight / 2 - originalCenterY * zoomY;

      // ZOOMSLIDERS BIJWERKEN
      // sliders laten overeenkomen met zoomfactoren grafiek
      select('#horizontalZoom').property('value', zoomX);
      select('#verticalZoom').property('value', zoomY);

      // GRAFIEK OPNIEUW TEKENEN
      updateZoomView();
    });

  
  
  // drag gedrag activeren
  interactionArea.call(dragBehavior);

  // cursor aanpassen aan de geselecteerde mode
  const updateMouseCursor = () => {

    interactionArea.style(
      'cursor',
      mouseMode === 'drag' ? 'grab' : 'crosshair'
    );
  };

  // standaard cursor instellen
  updateMouseCursor();

  // MOUSE MODE ONMIDELLIJK BIJWERKEN
  // drag of select meteen activeren bij kiezen van de optie
  select('#mouseMode').on('change', function() {
    // geselecteerde muisfunctionaliteit ophalen
    mouseMode = select(this).property('value');

    // cursor onmiddellijk aanpassen
    updateMouseCursor();

    // eeventuele selectierechthoek verbergen
    selectionRectangle.style('display', 'none');
  });


  // ZOOM OUT BUTTON 

  // teruggaan naar oorspronkelijke weergave
  select('#resetZoom').on('click', function() {

    // zoomfactoren resetten
    zoomX = 1;
    zoomY = 1;

    // verschuiving resetten
    offsetX = 0;
    offsetY = 0;

    // beide sliders terug op 1 plaatsen
    select('#horizontalZoom').property('value', 1);
    select('#verticalZoom').property('value', 1);

    // eventuele selectierechthoek verbergen
    selectionRectangle.style('display', 'none');

    // volledige grafiek opnieuw tekenen
    updateZoomView();
  })
  
  // TIJDWEERGAVE BIJWERKEN

  // De tijdweergave aanpassen wanneer de gebruiker
  // op de Update knop klikt

  function updateTimeMode() {

    // De geselecteerde tijdweergave ophalen
    timeMode = select('#timeMode').property('value');


    // Het tijdsbereik opnieuw berekenen
    const newXDomain = extent(validData, xValue);

    // De X-schalen bijwerken
    xScale.domain(newXDomain);
    overviewXScale.domain(newXDomain);


    // De dots in de minimap opnieuw positioneren
    overviewCircles.attr(
      'cx',
      (d) => overviewXScale(xValue(d))
    );
  }


  // REAGEREN OP WIJZIGINGEN VAN DE SORTEERVOLGORDE

  // SORTEERVOLGORDE BIJWERKEN

  // De cases opnieuw sorteren wanneer de gebruiker
  // op de Update knop klikt

  function updateCaseSorting() {

    // Geselecteerd sorteercriterium ophalen
    const sortType = select('#sortSelect').property('value');


    // Geselecteerde sorteerrichting ophalen
    const direction = select('#sortDirection').property('value');


    // Cases in de gekozen volgorde plaatsen
    const sortedCases = sortCases(
      sortType,
      direction
    );


    // De Y-schalen bijwerken
    yScale.domain(sortedCases);
    overviewYScale.domain(sortedCases);


    // Dots in de minimap opnieuw positioneren
    overviewCircles.attr('cy', (d) => {

      return overviewYScale(yValue(d)) +
        overviewYScale.bandwidth() / 2;

    });

  }

  // UPDATE BUTTON

  // Alle instellingen tegelijk toepassen

  select('#updateButton').on('click', function() {
    
    // tijdweergave en sortering
    const selectedTimeMode =
      select('#timeMode').property('value');
    
    const timeChanged = selectedTimeMode !== timeMode;

    // bijwerken
    updateTimeMode();

    // sorteervolgorde bijwerken
    updateCaseSorting();

    // zoom settings
    const newZoomX = Number(
      select('#horizontalZoom').property('value')
    );

    const newZoomY = Number(
      select('#verticalZoom').property('value')
    );

    // middelpunt bepalen
    const centerX = (innerWidth / 2 - offsetX) / zoomX;
    const centerY = (innerHeight / 2 - offsetY) / zoomY;

    // controleren of sortering ongewijzigd is
    const newCaseOrder = yScale.domain().join('\u0000');

    // bij verandering positie resetten
    if (timeChanged) {
      offsetX = 0;
      offsetY = 0;
    }

    // nieuwe zoomfactoren toepassen
    zoomX = Math.max(1, Math.min(maximumZoom, newZoomX));
    zoomY = Math.max(1, Math.min(maximumZoom, newZoomY));

    // zoomen rond middelpunt
    if (timeChanged) {
      offsetX = innerWidth / 2 - (innerWidth / 2) * zoomX;
      offsetY = innerHeight / 2 - (innerHeight / 2) * zoomY;
    } else {
      offsetX = innerWidth / 2 - centerX * zoomX;
      offsetY = innerHeight / 2 - centerY * zoomY;
    }

    // hoofddgrafiek, assen en minimap tekenen
    updateZoomView();


  });


// FOUTMELDING WANNEER DE DATA NIET KAN WORDEN INGELEZEN

}).catch((error) => {

  console.error('Could not load the dotted chart data:', error);

  select('.chartArea')
    .append('p')
    .text('Could not load data_sample_1000.csv. Check the file location and browser console.');
});