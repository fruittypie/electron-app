import osUtils from 'os-utils';
import os from 'os';

const POLLING_INTERVAL = 1000;

export function pollResources(mainWindow) {
    setInterval(async () => {
        const cpuUsage =  await getCpuUsage();
        const ramUsage = getRamUsage();
        mainWindow.webContents.send("statistics", {
            cpuUsage,
            ramUsage,
        });
    }, POLLING_INTERVAL);
}

function getCpuUsage() {
    return new Promise(resolve => {
        osUtils.cpuUsage(resolve)
    })
}

function getRamUsage() {
    return 1 - osUtils.freememPercentage();
}

export function getStaticData() {
    const cpuModel = os.cpus()[0].model;
    const totalMemoryGB = Math.floor(osUtils.totalmem() / 1024);

    return {
        cpuModel,
        totalMemoryGB,
    }
}