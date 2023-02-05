import {getCoords, getGeomagneticData} from "./geomagnet.js";

require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",

    "esri/widgets/Search",
    "esri/widgets/Locate",
    "esri/widgets/BasemapToggle",
    "esri/widgets/support/DatePicker",

    "esri/Graphic",

    "esri/geometry/Point"

], function(esriConfig, Map, MapView, Search, Locate, BasemapToggle, DatePicker, Graphic, Point) {
    esriConfig.apiKey = "AAPK1ce793dff955490f8fde71918cba5e10h-3z4UAL7OpDVFSTBdZ2bliECBtnlUd4mxJ9060z_n8MT3o-_LgcE8Pz4HCovqe9";

    // Карта
    const map = new Map({
        basemap: "arcgis-streets-relief",
        ground: "world-elevation"
    });

    // Отображение карты
    // Местоположение возьмем из localStorage или Уфа
    let lastPosition = JSON.parse(localStorage["lastPosition"] || "null") || [55.97, 54.74]
    let lastZoom = localStorage["lastZoom"] || 12
    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: new Point(lastPosition),
        zoom: lastZoom
    });

    // Начальная геолокация
    const options = {
        enableHighAccuracy: true,
        timeout: 5000
    };

    // Геолокация только если нет последнего сохраненного местоположения
    if (!localStorage["lastPosition"])
        navigator.geolocation.getCurrentPosition((pos) =>
                view.goTo({center: [pos.coords.longitude, pos.coords.latitude]}),
            () => console.warn("Не удалось определить геолокацию"), options);

    // Виджет поиска
    const search = new Search({
        view: view
    });
    view.ui.add(search, "top-right");

    // Виджет выбора координат
    const panel = document.getElementById("coordinatesPanel");
    view.ui.add(panel, "top-right");

    // Виджет выбора даты
    const datePicker = new DatePicker()
    view.ui.add(datePicker, "top-right")

    // Виджет геолокации
    const locate = new Locate({
        view: view,
        useHeadingEnabled: false,
        goToOverride: function(view, options) {
            // При геолокации показываем геомагнитные координаты
            options.target.scale = 1500;
            showGeomagneticPopup(new Point({
                latitude: options.target.target.latitude,
                longitude: options.target.target.longitude
            }))
            return view.goTo(options.target);
        }
    });
    view.ui.add(locate, "top-left");

    // Виджет изменения карты
    let basemapToggle = new BasemapToggle({
        view: view,
        nextBasemap: "hybrid"
    });
    view.ui.add(basemapToggle, "top-left");

    // Расчет координат по вводу
    async function onCalculateButtonClick() {
        /* Обработчик ввода координат */
        function validateNumberMinMax(inputString, min, max) {
            /* Проверяет, что введено число и оно входит заданные рамки */
            let inputNumber = Number(inputString)
            return !isNaN(inputNumber) && min <= inputNumber && max >= inputNumber
        }

        function getInput(elementId, min, max){
            /* Получает число из инпута, устанавливает ему статус
             и возвращает его, либо NaN, если введено невалидное значение */
            const coordinate = document.getElementById(elementId).value
            if (!validateNumberMinMax(coordinate, min, max)){
                document.getElementById(elementId).status = "invalid"
                return NaN
            }
            else {
                document.getElementById(elementId).status = "idle"
                return Number(coordinate)
            }
        }

        const latitude = getInput("latitudeInput", 0, 90)
        const longitude = getInput("longitudeInput", 0, 90)
        const elevation = getInput("elevationInput", 0, 1000000)

        // Если есть невалидные данные, выйдем
        if (isNaN(latitude) || isNaN(longitude) || isNaN(elevation))
            return

        // Иначе покажем геомагнитные данные по заданным координатам
        await showGeomagneticPopup(new Point({latitude: latitude, longitude: longitude}), elevation)
    }
    const calculateButton = document.getElementById("calculateButton");
    calculateButton.addEventListener("click", onCalculateButtonClick);

    // Отображение геомагнитных данных
    function fillGeomagneticTable(table, geoData) {
        /* Заполняет таблицу геоданными */
        // Каждой ячейке таблицы присвоен класс, по ним выставляются пришедшие данные
        const classDataMapping = {
            "geomagnetic-latitude": geoData.geomagneticCoordinates.latitudeMag,
            "geomagnetic-longitude": geoData.geomagneticCoordinates.longitudeMag,
            "geomagnetic-r": geoData.geomagneticCoordinates.rMag,

            "coordinates-north-pole": geoData.dipoleParameters.poleLatitude + "\n"
                + geoData.dipoleParameters.poleLongitude,
            "magnetic-moment": geoData.dipoleParameters.magneticMoment,

            "induction-potential": geoData.fieldParameters.inductionPotential,
            "north-component": geoData.fieldParameters.northComponent,
            "east-component": geoData.fieldParameters.eastComponent,
            "down-component": geoData.fieldParameters.downComponent,
            "total-intensity": geoData.fieldParameters.totalIntensity,
            "magnetic-declination": geoData.fieldParameters.magneticDeclination,
            "magnetic-inclination": geoData.fieldParameters.magneticInclination
        }

        // Заполним таблицу по данным
        for (let class_ in classDataMapping) {
            let element = table.querySelector("." + class_)
            element.textContent = classDataMapping[class_]
        }

        return table
    }

    async function mapOnClick(event) {
        /* Обработчик нажатия на карту */
        const mapPoint = event.mapPoint
        await showGeomagneticPopup(mapPoint)
    }

    async function showGeomagneticPopup(mapPoint, elevation=null) {
        /* Показывает попап с геомагнитными данными в заданной точке и высоте
        * если высота не задана, ищет ее */
        let title, content
        let coords
        try {
            // Попробуем запросить высоту и геоданные
            // Если высота не задана, запрашивает ее с ArcGIS
            if (elevation === null)
                coords = await getCoords(mapPoint, map)
            else
                coords = {latitude: mapPoint.latitude, longitude: mapPoint.longitude, elevation}
            const date = datePicker.value
            const geoData = await getGeomagneticData(coords, date)

            title = `Geomagnetic data\nLat: ${coords.latitude.toFixed(2)}, ` +
                `Lon: ${coords.longitude.toFixed(2)}, Elevation: ${coords.elevation.toFixed(2)}\n` +
                `Date: ${date.toLocaleString()}`
            // Возьмем таблицу, описанную в документе, заполним ее, потом вставим в попап
            content = document.getElementsByClassName("geomagnetic-table")[0].cloneNode(true)
            content.hidden = false
            fillGeomagneticTable(content, geoData)
        }
        catch (e) {
            // Если какой-то из запросов не пройдет, попап будет с ошибкой
            console.error(e)
            title = "Error"
            content = "Failed to get geomagnetic data"
        }

        view.popup.open({
            title,
            content,
            location: mapPoint,
        });
        view.popup.collapsed = false
        view.goTo({center: mapPoint})

        // Сохраняем последнее местоположение при клике на карту
        localStorage["lastPosition"] = JSON.stringify(mapPoint)
        localStorage["lastZoom"] = view.zoom

        // Добавим маркер к месту клика
        addMarker(coords.latitude, coords.longitude)

        // Синхронизируем инпуты координат с местом клика на карту
        document.getElementById("latitudeInput").value = coords.latitude.toFixed(4)
        document.getElementById("longitudeInput").value = coords.longitude.toFixed(4)
        document.getElementById("elevationInput").value = coords.elevation.toFixed(4)
    }

    function addMarker(latitude, longitude){
        /* Добавляет маркер на точку */
        const markerPoint = {
            type: "point", // autocasts as new Point()
            latitude,
            longitude
        }

        const markerSymbol = {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            color: [226, 119, 40]
        }

        const markerGraphic = new Graphic({
            geometry: markerPoint,
            symbol: markerSymbol
        });

        // Удалим старый маркер и добавим новый
        view.graphics.removeAll()
        view.graphics.add(markerGraphic)
    }

    view.popup.autoOpenEnabled = false  // Чтобы попап не закрывался по умолчанию на мобильных устройствах
    view.popup.dockOptions.position = "top-center"
    view.on("click", mapOnClick)
});