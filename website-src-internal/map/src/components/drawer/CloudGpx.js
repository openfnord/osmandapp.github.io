import React, { useEffect, useState, useContext } from 'react';
import { styled } from '@mui/material/styles';
import {
    Typography, ListItemText, Switch, Collapse, 
    IconButton, MenuItem, ListItemIcon, Tooltip,
} from "@mui/material";
import {
    DirectionsWalk, ExpandLess, ExpandMore, Sort, SortByAlpha
} from '@mui/icons-material';
import AppContext from "../../context/AppContext"

const toHHMMSS = function (time) {
    var sec_num = time / 1000;
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    return hours + ':' + minutes + ':' + seconds;
}

function updateTextInfo(gpxFiles, setAppText) {
    // Local GPX files: undefined tracks, NaN km, undefined wpts
    let dist = 0;
    let tracks = 0;
    let wpts = 0;
    let time = 0;
    let diffUp = 0;
    let diffDown = 0;
    Object.values(gpxFiles).forEach((item) => {
        if (item.local !== true && item.summary && item.url) {
            if (item.summary.totalTracks) {
                tracks += item.summary.totalTracks;
            }
            if (item.summary.wptPoints) {
                wpts += item.summary.wptPoints;
            }
            if (item.summary.totalDistance) {
                dist += item.summary.totalDistance;
            }
            if (item.summary.timeMoving) {
                time += item.summary.timeMoving;
            }
            if (item.summary.diffElevationUp) {
                diffUp += item.summary.diffElevationUp;
            }
            if (item.summary.diffElevationDown) {
                diffDown += item.summary.diffElevationDown;
            }
        }
    });
    setAppText(`Selected GPX files: ${tracks} tracks, ${(dist / 1000.0).toFixed(1)} km, ${wpts} wpts. 
            Time moving: ${toHHMMSS(time)}. 
            Uphill / Downhill: ${(diffUp).toFixed(0)} / ${(diffDown).toFixed(0)} m.`)
}

async function loadGpxInfo(item, ctx, layer, setAppText) {
    let gpxInfoUrl = `/map/api/get-gpx-info?type=${encodeURIComponent(item.type)}&name=${encodeURIComponent(item.name)}`;
    const response = await fetch(gpxInfoUrl, {});
    if (response.ok) {
        let data = await response.json();
        const newGpxFiles = Object.assign({}, ctx.gpxFiles);
        layer.summary = data.info;
        newGpxFiles[item.name] = layer;
        ctx.setGpxFiles(newGpxFiles);
        updateTextInfo(newGpxFiles, setAppText)
    }
}

function enableLayer(item, ctx, setAppText, visible) {
    let url = `/map/api/download-file?type=${encodeURIComponent(item.type)}&name=${encodeURIComponent(item.name)}`;
    const newGpxFiles = Object.assign({}, ctx.gpxFiles);
    if (!visible) {
        // delete newGpxFiles[item.name];
        newGpxFiles[item.name].url = null;
        ctx.setGpxFiles(newGpxFiles);
        updateTextInfo(newGpxFiles, setAppText)
    } else {
        newGpxFiles[item.name] = { 'url': url, 'clienttimems': item.clienttimems };
        ctx.setGpxFiles(newGpxFiles);
        loadGpxInfo(item, ctx, newGpxFiles[item.name], setAppText);
    }
}


export default function CloudGpx({ setAppText }) {
    const ctx = useContext(AppContext);
    const [gpxOpen, setGpxOpen] = useState(false);
    let gpxFiles = (!ctx.listFiles || !ctx.listFiles.uniqueFiles ? [] :
        ctx.listFiles.uniqueFiles).filter((item) => {
            return (item.type === 'gpx' || item.type === 'GPX')
                && (item.name.slice(-4) === '.gpx' || item.name.slice(-4) === '.GPX');
        });
    return <>
        <MenuItem onClick={(e) => setGpxOpen(!gpxOpen)}>
            <ListItemIcon>
                <DirectionsWalk fontSize="small" />
            </ListItemIcon>
            <ListItemText>Tracks {gpxFiles.length > 0 ? `(${gpxFiles.length})` : ''} </ListItemText>
            <Typography variant="body2" color="textSecondary">
                GPX
            </Typography>
            {
                gpxFiles.length === 0 ? <></> :
                    gpxOpen ? <ExpandLess /> : <ExpandMore />
            }
        </MenuItem>

        <Collapse in={gpxOpen} timeout="auto" unmountOnExit>
            <MenuItem disableRipple={true}>
                <IconButton sx={{ ml: 2 }}>
                    <Sort fontSize="small" />
                </IconButton>
                <IconButton sx={{ ml: 2 }}>
                    <SortByAlpha fontSize="small" />
                </IconButton>
            </MenuItem>
            {
                gpxFiles.map((item, index) => {
                    let localLayer = ctx.gpxFiles[item.name];
                    let timeRange = '';
                    let clienttime = '';
                    let distance = '';
                    let timeMoving = '';
                    let updownhill = '';
                    let speed = '';
                    if (item.clienttimems) {
                        clienttime =  new Date(item.clienttimems);
                    }
                    if (localLayer?.summary?.startTime) {
                        let stdate = new Date(localLayer.summary.startTime).toDateString();
                        let edate = new Date(localLayer.summary.endTime).toDateString();
                        timeRange = new Date(localLayer.summary.startTime).toDateString() + " " +
                        new Date(localLayer.summary.startTime).toLocaleTimeString() + " - " + 
                            (edate !== stdate ? edate : '') + 
                        new Date(localLayer.summary.endTime).toLocaleTimeString();
                    }
                    if (localLayer?.summary?.totalDistance) {
                        distance = "Distance: " + (localLayer?.summary?.totalDistance / 1000).toFixed(1) + " km";
                    }
                    if (localLayer?.summary?.timeMoving) {
                        timeMoving = "Time moving: " + toHHMMSS(localLayer?.summary?.timeMoving );
                    }
                    if (localLayer?.summary?.diffElevationDown) {
                        updownhill = "Uphill/downhill: " + localLayer?.summary?.diffElevationUp.toFixed(0) 
                            + "/" + localLayer?.summary?.diffElevationDown.toFixed(0) + " m";
                    }
                    if (localLayer?.summary?.avgSpeed) {
                        speed = "Speed (min/avg/max): " + 
                            (localLayer?.summary?.minSpeed * 3.6).toFixed(0) + " / " + 
                            (localLayer?.summary?.avgSpeed * 3.6).toFixed(0) + " / " +
                            (localLayer?.summary?.maxSpeed * 3.6).toFixed(0) + " km/h"
                    }

                    return (
                        <MenuItem key={item.name}>
                            <Tooltip title={<div>
                                {item.name}
                                {clienttime ? <br /> : <></>} {clienttime}
                                {timeRange ? <><br /><br />Time: </> : <></>}  {timeRange}
                                {distance ? <br /> : <></>} {distance}
                                {timeMoving ? <br /> : <></>} {timeMoving}
                                {updownhill ? <br /> : <></>} {updownhill}
                                {speed ? <br /> : <></>} {speed}
                            </div>}>
                            <ListItemText inset>
                                <Typography variant="inherit" noWrap>
                                    {item.name.slice(0, -4).replace('_', ' ')}
                                </Typography>
                            </ListItemText>
                        </Tooltip>
                        <Switch
                            checked={localLayer?.url ? true : false}
                            onChange={(e) => {
                                enableLayer(item, ctx, setAppText, e.target.checked);
                            }} />
                    </MenuItem>)
                })
            }
        </Collapse>
    </>;

}