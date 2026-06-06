// This script runs directly on the webpage (Facebook, Instagram, etc.)
// It finds media (videos and images) and injects the download arrow.

function triggerDownload(url) {
    chrome.runtime.sendMessage({ action: 'downloadMedia', url: url }, (response) => {
        if (!response || !response.success) {
            console.error("Download failed or was rejected.");
        }
    });
}

function injectDownloadButtons() {
    // Find all video and img elements on the page
    const mediaElements = document.querySelectorAll('video, img');
    
    mediaElements.forEach(media => {
        // Skip small images (e.g., icons, avatars)
        if (media.tagName.toLowerCase() === 'img') {
            if (media.width < 100 || media.height < 100) return;
        }

        // Skip if we already added a button to this media's container
        if (media.parentElement && !media.parentElement.querySelector('.magic-dl-container')) {
            
            // Create a container for the buttons
            const container = document.createElement('div');
            container.className = 'magic-dl-container';
            container.style.cssText = `
                position: absolute;
                top: 15px;
                right: 15px;
                z-index: 2147483647;
                display: flex;
                gap: 6px;
                opacity: 0.5;
                transition: opacity 0.2s ease-in-out;
            `;

            const btnStyles = `
                padding: 6px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                border: 1.5px solid white;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            `;

            const isVideo = media.tagName.toLowerCase() === 'video';

            // Create the open button
            const openBtn = document.createElement('button');
            openBtn.className = 'magic-open-btn';
            openBtn.title = 'Open in New Tab';
            openBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
            openBtn.style.cssText = btnStyles;
            openBtn.onmouseover = () => openBtn.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
            openBtn.onmouseout = () => openBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';

            // Create the download button ONLY for images
            let dlBtn = null;
            if (!isVideo) {
                dlBtn = document.createElement('button');
                dlBtn.className = 'magic-dl-btn';
                dlBtn.title = 'Download';
                dlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
                dlBtn.style.cssText = btnStyles;
                dlBtn.onmouseover = () => dlBtn.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
                dlBtn.onmouseout = () => dlBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }

            // Ensure the parent container can hold absolute positioned elements
            if (window.getComputedStyle(media.parentElement).position === 'static') {
                media.parentElement.style.position = 'relative';
            }

            // Hover logic to show container fully when hovered
            container.addEventListener('mouseenter', () => {
                container.style.opacity = '1';
            });
            container.addEventListener('mouseleave', () => {
                container.style.opacity = '0.5';
            });

            const getMediaUrl = (callback) => {
                let directSrc = media.src;
                
                // If it's a video and src is missing or a blob, check <source> tags
                if ((!directSrc || directSrc.startsWith('blob:') || directSrc.startsWith('data:')) && isVideo) {
                    const sourceTag = media.querySelector('source');
                    if (sourceTag && sourceTag.src && !sourceTag.src.startsWith('blob:') && !sourceTag.src.startsWith('data:')) {
                        directSrc = sourceTag.src;
                    }
                }

                if (directSrc && !directSrc.startsWith('blob:') && !directSrc.startsWith('data:')) {
                    callback(directSrc);
                } else {
                    const mediaType = isVideo ? 'video' : 'img';
                    chrome.runtime.sendMessage({ action: 'getMediaUrls', mediaType: mediaType }, (response) => {
                        if (response && response.urls && response.urls.length > 0) {
                            callback(response.urls[response.urls.length - 1]);
                        } else {
                            alert('Media URL not intercepted yet. Please play the media for a second and click again!');
                        }
                    });
                }
            };

            // Handle the click event for download (only if it exists)
            if (dlBtn) {
                dlBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent clicking the media underneath
                    getMediaUrl((url) => triggerDownload(url));
                });
            }

            // Handle the click event for open in new tab
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent clicking the media underneath
                getMediaUrl((url) => {
                    chrome.runtime.sendMessage({ action: 'openInNewTab', url: url });
                });
            });

            // Add the buttons to the container and the container to the media's parent
            container.appendChild(openBtn);
            if (dlBtn) {
                container.appendChild(dlBtn);
            }
            media.parentElement.appendChild(container);
        }
    });
}

// Platforms like Facebook and Instagram load media dynamically as you scroll.
// We use an interval to continuously check for new media appearing on the screen.
setInterval(injectDownloadButtons, 1500);