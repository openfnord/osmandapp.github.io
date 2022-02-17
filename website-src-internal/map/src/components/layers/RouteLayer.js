import React, { useEffect, useRef, useContext, useState, useMemo, useCallback } from 'react';
import { Marker, CircleMarker, GeoJSON, useMap } from "react-leaflet";
import L from 'leaflet';
import MarkerIcon from '../MarkerIcon.js'
import AppContext from "../../context/AppContext";
import { useSearchParams } from 'react-router-dom';

function dist(a1, a2) {
    // distance is not correct
    return (a1.lat - a2.lat) * (a1.lat - a2.lat) +
        (a1.lng - a2.lng) * (a1.lng - a2.lng);
}

function moveableMarker(ctx, map, marker) {
    let moved ;
    let mv;
    function trackCursor(evt) {
        marker.setLatLng(evt.latlng)
    }

    marker.on("mousedown", () => {
        moved = marker._point;
        mv = marker.getLatLng();
        map.dragging.disable()
        map.on("mousemove", trackCursor)
    })

    marker.on("mouseup", () => {
        map.dragging.enable();
        map.off("mousemove", trackCursor);
        if (moved && Math.abs(moved.x - marker._point.x) + Math.abs(moved.y - marker._point.y) > 10) {
            let newInterPoints = Object.assign([], ctx.interPoints);
            let minInd = -1;
            if (ctx.interPoints.length > 0) {
                let minDist = dist(ctx.endPoint, mv) +
                    dist(ctx.interPoints[ctx.interPoints.length - 1], mv);
                for (let i = 0; i < ctx.interPoints.length; i++) {
                    let dst = dist(i == 0 ? ctx.startPoint : ctx.interPoints[i - 1], mv) +
                        dist(ctx.interPoints[i], mv);
                    if (dst < minDist) {
                        minInd = i;
                        minDist = dst;
                    }
                }
            }
            if (minInd < 0) {
                newInterPoints.push(marker.getLatLng());
            } else {
                newInterPoints.splice(minInd, 0, marker.getLatLng());
            }
            ctx.setInterPoints(newInterPoints);
        }
    })

    return marker
}

const RouteLayer = () => {
    const map = useMap();
    const ctx = useContext(AppContext);
    
    const [searchParams, setSearchParams] = useSearchParams({});
    useEffect(() => {
        let obj = {};
        if (ctx.startPoint) {
            obj['start'] = ctx.startPoint.lat.toFixed(6) + ',' + ctx.startPoint.lng.toFixed(6);
        }
        if (ctx.interPoints?.length > 0) {
            let r = '';
            ctx.interPoints.forEach((it, ind) => {
                r += ',' + ctx.endPoint.lat.toFixed(6) + ',' + ctx.endPoint.lng.toFixed(6);
            })
            obj['ipoints'] = r.substring(1);
        }
        if (ctx.endPoint) {
            obj['end'] = ctx.endPoint.lat.toFixed(6) + ',' + ctx.endPoint.lng.toFixed(6);
        }
        if (Object.keys(obj).length > 0) {
            if (ctx.routeMode?.mode) {
                obj['mode'] = ctx.routeMode.mode;
            }
            if (obj['start'] !== searchParams.get('start') || obj['end'] !== searchParams.get('end') ||
                obj['mode'] !== searchParams.get('mode')) {
                setSearchParams(obj);
            }
        }
    }, [ctx.startPoint, ctx.endPoint, ctx.routeMode]);

    const startPointRef = useRef(null);
    const endPointRef = useRef(null);
    const startEventHandlers = useCallback({
        dragend() {
            const marker = startPointRef.current;
            if (marker != null) {
                ctx.setStartPoint(marker.getLatLng());
                ctx.setRouteTrackFile(null);
            }
        },
        click() {
            // ctx.setStartPoint(null);
            // ctx.setRouteData(null);
        }
    }, [ctx.setStartPoint, startPointRef]);
    const endEventHandlers = useCallback({
        dragend() {
            const marker = endPointRef.current;
            if (marker != null) {
                ctx.setEndPoint(marker.getLatLng());
                ctx.setRouteTrackFile(null);
            }
        }
    }, [ctx.setEndPoint, endPointRef]);

    const intermediatEventHandlers = useCallback({
        // click called after dragend
        clicknotworking(event) {
           // console.log('Marker clicked');
            let ind = event.target.options['data-index'];
            let newinter = Object.assign([], ctx.interPoints);
            newinter.splice(ind, 1);
            ctx.setInterPoints(newinter);
        },
        dragend(event) {
            // console.log('Marker dragged');
            let ind = event.target.options['data-index'];
            let newinter = Object.assign([], ctx.interPoints);
            newinter[ind] = event.target.getLatLng();
            ctx.setInterPoints(newinter);
        }
    }, [ctx.setInterPoints, ctx.interPoints]);


    useEffect(() => {
        if (map) {
            // const map = mapRef.current;
            map.contextmenu.removeAllItems();
            map.contextmenu.addItem({
                text: 'Set as start',
                callback: (e) => ctx.setStartPoint(e.latlng)
            });
            map.contextmenu.addItem({
                text: 'Set as end',
                callback: (e) => ctx.setEndPoint(e.latlng)
            });
        }
    }, [ctx.startPoint, ctx.endPoint, ctx.setStartPoint, ctx.setEndPoint, map, ctx.setRouteData]);
    const geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    const onEachFeature = (feature, layer) => {
        if (feature.properties && feature.properties.description) {
            layer.bindPopup(feature.properties.description);
        }
    }
    const pointToLayer = (feature, latlng) => {
        let opts = Object.assign({}, geojsonMarkerOptions);
        if (feature.properties && feature.properties.description && 
            feature.properties.description.includes('[MUTE]')) {
            opts.fillColor = '#777';
        }
        return moveableMarker(ctx, map, L.circleMarker(latlng, opts));
    };


    return <>
        {ctx.routeData && <GeoJSON key={ctx.routeData.id} data={ctx.routeData.geojson}
            pointToLayer={pointToLayer} onEachFeature={onEachFeature} />}
        {ctx.startPoint && //<CircleMarker center={ctx.startPoint} radius={5} pathOptions={{ color: 'green' }} opacity={1}
            <Marker position={ctx.startPoint} icon={MarkerIcon({ bg: 'blue' })}
                ref={startPointRef} draggable={true} eventHandlers={startEventHandlers} />}
        {ctx.interPoints.map((it, ind) => 
            // <CircleMarker key={'mark'+ind} center={it} radius={5} pathOptions={{ color: 'green', 
            //     radius: 8, fillOpacity: 0.8 }} opacity={1} on
            <Marker key={'mark' + ind} data-index={ind} position={it} icon={MarkerIcon({ bg: 'blue' })}
                    draggable={true} eventHandlers={intermediatEventHandlers}/>)}
        {ctx.endPoint && <Marker position={ctx.endPoint} icon={MarkerIcon({ bg: 'red' })}
            ref={endPointRef} draggable={true} eventHandlers={endEventHandlers} />}
    </>;
};

export default RouteLayer;
