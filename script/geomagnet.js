async function getCoords(point, map) {
    /*
    Получает высоту по точке на карте. Возвращает объект с широтой, долготой и высотой
    point - точка на карте, map - карта
     */
    let coords = {
        latitude: point.latitude,
        longitude: point.longitude
    }

    coords.elevation = await map.ground.queryElevation(point)
    coords.elevation = coords.elevation.geometry.z

    return coords
}

function parseResponse(response) {
    /* Строит объект с геоданными из пришедшего массива */
    return {
        // Geomagnetic Coordinates
        geomagneticCoordinates: {
            latitudeMag: response[13].toFixed(3),
            longitudeMag: response[14].toFixed(3),
            rMag: response[15].toFixed(3)
        },

        // Dipole parameters
        dipoleParameters: {
            poleLatitude: response[10].toFixed(3) + " N",
            poleLongitude: response[11].toFixed(3) + " E",
            magneticMoment: response[12].toExponential(4)
        },

        // Field parameters
        fieldParameters: {
            inductionPotential: response[3].toExponential(4),
            northComponent: response[4].toFixed(1),
            eastComponent: response[5].toFixed(1),
            downComponent: response[6].toFixed(1),
            totalIntensity: response[7].toFixed(1),
            magneticDeclination: response[8].toFixed(1),
            magneticInclination: response[9].toFixed(1)
        }
    }
}

async function getGeomagneticData(coords, date) {
    /*
    Делает запрос на сервер и получает геомагнитные данные. Возвращает объект с данными.
    coords - координаты долготы, ширины и высоты, date - дата
     */
    let yearProportion = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000
    yearProportion = (yearProportion / 365).toFixed(2).split(".")[1]

    const sp = new URLSearchParams({
        lat: coords.latitude.toFixed(4),
        lng: coords.longitude.toFixed(4),
        alt: (coords.elevation / 1000).toFixed(3),
        data: date.getUTCFullYear() + "." + yearProportion,
        h: date.getUTCHours()
    })
    const url = "https://geomagnet.ru/calc/?" + sp
    let geoData = await fetch(url)
    geoData = await geoData.json()

    return parseResponse(geoData)
}

export {getCoords, getGeomagneticData}