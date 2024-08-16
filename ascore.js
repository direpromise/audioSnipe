// ==UserScript==
// @name         Audio File Detector and Downloader with Progress Bar and Notification Badge
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Detect and download audio files (.wav, .mp3, .ogg) from webpages into a ZIP file with progress tracking and notification badge
// @author       YourName
// @match        *://*/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.0/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    function detectAudioFiles() {
        const audioExtensions = ['.wav', '.mp3', '.ogg'];
        const audioFiles = new Set();

        // Detect audio files from <audio> elements and their sources
        document.querySelectorAll('audio').forEach(audio => {
            const sources = new Set();

            audio.querySelectorAll('source').forEach(source => {
                const src = source.src;
                if (src && audioExtensions.some(ext => src.endsWith(ext))) {
                    sources.add(src);
                }
            });

            // If the <audio> element itself has a src, add it only if it's not already in sources
            const src = audio.src;
            if (src && audioExtensions.some(ext => src.endsWith(ext)) && !sources.has(src)) {
                sources.add(src);
            }

            // Add all unique sources to audioFiles
            sources.forEach(source => audioFiles.add(source));
        });

        // Detect audio files from direct <a> links
        document.querySelectorAll('a').forEach(link => {
            const href = link.href;
            if (href && audioExtensions.some(ext => href.endsWith(ext)) && !href.includes('index.php')) {
                audioFiles.add(href);
            }
        });

        console.log("Detected audio files:", Array.from(audioFiles)); // Log detected files
        return Array.from(audioFiles);
    }

    function getFileName(url) {
        return url.split('/').pop().split('?')[0];
    }

    function createProgressBar() {
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.position = 'fixed';
        progressBarContainer.style.top = '20px';
        progressBarContainer.style.left = '50%';
        progressBarContainer.style.transform = 'translateX(-50%)';
        progressBarContainer.style.width = '80%';
        progressBarContainer.style.backgroundColor = '#f0f0f0';
        progressBarContainer.style.borderRadius = '8px';
        progressBarContainer.style.padding = '10px';
        progressBarContainer.style.boxShadow = '0px 2px 10px rgba(0, 0, 0, 0.2)';
        progressBarContainer.style.zIndex = '9999';
        progressBarContainer.style.textAlign = 'center';
        progressBarContainer.style.fontSize = '14px';

        const progressBar = document.createElement('div');
        progressBar.style.height = '24px';
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#4caf50';
        progressBar.style.borderRadius = '8px';

        const progressText = document.createElement('span');
        progressText.style.marginTop = '5px';
        progressText.style.display = 'block';
        progressText.textContent = 'Preparing to download...';

        progressBarContainer.appendChild(progressBar);
        progressBarContainer.appendChild(progressText);
        document.body.appendChild(progressBarContainer);

        return { progressBar, progressText, progressBarContainer };
    }

    function updateProgressBar(progress, text, progressBar, progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = text;
    }

    function removeProgressBar(progressBarContainer) {
        setTimeout(() => {
            progressBarContainer.remove();
        }, 2000);
    }

    async function downloadFilesAsZip(files) {
        if (files.length === 0) {
            alert('No audio files found on this page.');
            return;
        }

        const zip = new JSZip();
        const { progressBar, progressText, progressBarContainer } = createProgressBar();
        let completed = 0;
        const addedFiles = {};

        for (const file of files) {
            try {
                let fileName = getFileName(file);

                if (!fileName.startsWith('File:') && !addedFiles[fileName]) {
                    console.log(`Fetching: ${fileName} from ${file}`); // Log file being fetched
                    const response = await fetch(file);

                    if (!response.ok) {
                        console.error(`Failed to fetch ${fileName}:`, response.statusText);
                        continue;
                    }

                    const blob = await response.blob();
                    console.log(`Fetched ${fileName} with MIME type: ${blob.type}`); // Log fetched file type

                    zip.file(fileName, blob);
                    addedFiles[fileName] = true;

                    completed++;
                    const progress = Math.round((completed / files.length) * 100);
                    updateProgressBar(progress, `Downloading ${completed} of ${files.length} files...`, progressBar, progressText);
                }
            } catch (error) {
                console.error('Error downloading file:', file, error);
            }
        }

        if (Object.keys(addedFiles).length > 0) {
            updateProgressBar(100, 'Compressing files into ZIP...', progressBar, progressText);
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            if (typeof saveAs !== 'undefined') {
                saveAs(zipBlob, 'audio_files.zip');
            } else {
                console.error('FileSaver.js is not loaded or saveAs is not defined.');
            }

            updateProgressBar(100, 'Download complete!', progressBar, progressText);
        } else {
            console.error('No valid audio files were added to the ZIP.');
            alert('No valid audio files were found to download.');
        }

        removeProgressBar(progressBarContainer);
    }

    function createNotificationBadge(count) {
        const badge = document.createElement('div');
        badge.textContent = count;
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-5px';
        badge.style.width = '20px';
        badge.style.height = '20px';
        badge.style.backgroundColor = '#FF3B30';
        badge.style.borderRadius = '50%';
        badge.style.color = '#fff';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = 'bold';
        badge.style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.3)';
        badge.style.zIndex = '10000';
        return badge;
    }

    function createDownloadButton() {
        const button = document.createElement('div');
        button.innerHTML = '⬇️';
        button.style.position = 'fixed';
        button.style.top = '20px';
        button.style.left = '50%';
        button.style.transform = 'translateX(-50%)';
        button.style.width = '50px';
        button.style.height = '50px';
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        button.style.borderRadius = '50%';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.color = '#fff';
        button.style.fontSize = '24px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '9999';
        button.title = 'Download audio files';

        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });

        const audioFiles = detectAudioFiles();
        if (audioFiles.length > 0) {
            const badge = createNotificationBadge(audioFiles.length / 2);
            button.appendChild(badge);
        }

        button.addEventListener('click', () => {
            downloadFilesAsZip(audioFiles);
        });

        document.body.appendChild(button);
    }

    function main() {
        createDownloadButton();
    }

    main();
})();
