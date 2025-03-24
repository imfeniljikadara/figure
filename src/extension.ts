import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('figure.new', () => {
            const panel = vscode.window.createWebviewPanel(
                'figure',
                'Figure',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getWebviewContent();

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'save':
                            saveDrawing(message.data);
                            return;
                        case 'export':
                            exportDrawing(message.data, message.format);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: blob:; script-src https: 'unsafe-inline' 'unsafe-eval'; style-src https: 'unsafe-inline'; font-src https:;"/>
        <title>Figure</title>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            #app {
                width: 100%;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="app"></div>
        <script>
            // Initialize VS Code API
            const vscode = acquireVsCodeApi();

            // Function to load scripts in sequence
            function loadScript(src) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // Load all required scripts in sequence
            Promise.all([
                loadScript('https://unpkg.com/react@17.0.2/umd/react.production.min.js'),
                loadScript('https://unpkg.com/react-dom@17.0.2/umd/react-dom.production.min.js')
            ]).then(() => {
                return loadScript('https://unpkg.com/@excalidraw/excalidraw@0.15.2/dist/excalidraw.production.min.js');
            }).then(() => {
                // Initialize the app after all scripts are loaded
                initializeApp();
            }).catch(error => {
                console.error('Error loading scripts:', error);
                document.getElementById('app').innerHTML = 'Error loading Figure. Please try refreshing the page.';
            });

            function initializeApp() {
                const App = () => {
                    const excalidrawRef = React.useRef(null);
                    
                    React.useEffect(() => {
                        const isDark = document.body.classList.contains('vscode-dark');
                        if (excalidrawRef.current) {
                            excalidrawRef.current.updateScene({ theme: isDark ? "dark" : "light" });
                        }
                    }, []);

                    const ExcalidrawComponent = window.Excalidraw?.default || window.ExcalidrawLib?.Excalidraw;
                    if (!ExcalidrawComponent) {
                        return React.createElement('div', null, 'Loading Figure...');
                    }

                    return React.createElement(ExcalidrawComponent, {
                        ref: excalidrawRef,
                        onChange: (elements, appState) => {
                            console.log("Drawing changed");
                        },
                        onSave: (elements, appState) => {
                            vscode.postMessage({
                                command: 'save',
                                data: { elements, appState }
                            });
                        },
                        theme: document.body.classList.contains('vscode-dark') ? "dark" : "light",
                        gridModeEnabled: true
                    });
                };

                // Use ReactDOM.render instead of createRoot for React 17
                ReactDOM.render(
                    React.createElement(App),
                    document.getElementById('app')
                );

                // Handle theme changes
                window.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message.type === 'themeChanged') {
                        const theme = message.theme === 'dark' ? 'dark' : 'light';
                        const excalidrawElement = document.querySelector('.excalidraw');
                        if (excalidrawElement) {
                            excalidrawElement.updateScene({ theme });
                        }
                    }
                });
            }
        </script>
    </body>
    </html>`;
}

function saveDrawing(data: any) {
    vscode.window.showSaveDialog({
        filters: {
            'Figure Files': ['figure']
        }
    }).then(fileUri => {
        if (fileUri) {
            vscode.workspace.fs.writeFile(
                fileUri,
                Buffer.from(JSON.stringify(data, null, 2))
            ).then(() => {
                vscode.window.showInformationMessage('Figure saved successfully!');
            });
        }
    });
}

function exportDrawing(data: any, format: 'png' | 'svg') {
    // Implementation for export functionality
    vscode.window.showInformationMessage(`Export to ${format} will be available soon!`);
}

export function deactivate() {} 