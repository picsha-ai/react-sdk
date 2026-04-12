import React, { useState, useEffect } from 'react';
import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';
import Tus from '@uppy/tus';
import Dashboard from '@uppy/react/dashboard';

export interface PicshaUploadWidgetProps {
    apiUrl: string;
    getToken?: () => Promise<string | null>;
    onUploadSuccess?: (asset: any) => void;
    onError?: (error: Error) => void;
    maxFileSize?: number;
    theme?: 'light' | 'dark' | 'auto';
    width?: string | number;
    height?: string | number;
    autoProceed?: boolean;
    useResumable?: boolean;
    orgId?: string;
    config?: any;
}

export const PicshaUploadWidget: React.FC<PicshaUploadWidgetProps> = ({
    apiUrl,
    getToken,
    onUploadSuccess,
    onError,
    maxFileSize = 1000 * 1024 * 1024, // 1GB default
    theme = 'dark',
    width = '100%',
    height = 450,
    autoProceed = false,
    useResumable = false,
    orgId,
    config = {},
}) => {
    const [uppy] = useState(() => {
        const uppyInstance = new Uppy({
            autoProceed,
            restrictions: {
                maxFileSize,
                minNumberOfFiles: 1,
            },
        });

        const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const baseUrl = cleanUrl.replace(/\/v1$/, '');

        if (useResumable) {
            uppyInstance.use(Tus, {
                endpoint: `${baseUrl}/v1/upload/resumable/`,
                retryDelays: [0, 1000, 3000, 5000],
                removeFingerprintOnSuccess: true,
                limit: 5,
                onBeforeRequest: async (req) => {
                    if (getToken) {
                        const token = await getToken();
                        if (token) {
                            req.setHeader('Authorization', `Bearer ${token}`);
                        }
                    }
                }
            });

            // Set metadata on file add so TUS sends it over to the server
            uppyInstance.on('file-added', (file) => {
                uppyInstance.setFileMeta(file.id, {
                    orgId: orgId || 'default',
                    name: file.name,
                    filetype: file.type || 'application/octet-stream'
                });
            });

        } else {
            uppyInstance.use(AwsS3, {
                shouldUseMultipart: false,
                limit: 5,
                getUploadParameters: async (file: any) => {
                    try {
                        const token = getToken ? await getToken() : null;
                        const headers: Record<string, string> = {
                            'Content-Type': 'application/json'
                        };
                        if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                        }

                        const safeName = file.name ? String(file.name) : 'unnamed';
                        const safeType = file.type ? String(file.type) : 'application/octet-stream';
                        const endpoint = `${baseUrl}/v1/assets/presigned?filename=${encodeURIComponent(safeName)}&contentType=${encodeURIComponent(safeType)}`;

                        const response = await fetch(endpoint, { method: 'GET', headers });

                        if (!response.ok) {
                            throw new Error(`Failed to get presigned URL: ${response.statusText}`);
                        }

                        const data = await response.json();

                        return {
                            method: data.method,
                            url: data.url,
                            fields: data.fields,
                            headers: data.headers,
                        };
                    } catch (err: any) {
                        if (onError) onError(err);
                        throw err;
                    }
                },
            });
        }

        return uppyInstance;
    });

    const configRef = React.useRef(config);
    React.useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        const handler = async (_file: any, response: any) => {
            try {
                if (response.uploadURL) {
                    const url = new URL(response.uploadURL);
                    let key = url.pathname.substring(1);
                    if (useResumable) {
                        // TUS saves the file to S3 at the bare UUID key (the last path segment)
                        // It does not use the `/v1/upload/resumable` path internally in S3.
                        key = url.pathname.split('/').pop() || key;
                    }

                    const originalName = _file ? _file.name : 'uploaded-file';

                    const token = getToken ? await getToken() : null;
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json'
                    };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
                    const baseUrl = cleanUrl.replace(/\/v1$/, '');
                    const registerRes = await fetch(`${baseUrl}/v1/assets`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            s3Key: key,
                            originalName: originalName,
                            config: configRef.current
                        })
                    });

                    if (!registerRes.ok) {
                        throw new Error(`Failed to register asset: ${registerRes.statusText}`);
                    }

                    const registeredAsset = await registerRes.json();
                    if (onUploadSuccess) onUploadSuccess(registeredAsset);
                }
            } catch (err: any) {
                if (onError) onError(err);
                console.error('PicshaUploadWidget: Failed to register asset:', err);
            }
        };

        uppy.on('upload-success', handler);

        const errorHandler = (error: any) => {
            console.error('Uppy general error:', error);
        };
        const uploadErrorHandler = (file: any, error: any, response: any) => {
            console.error('Uppy upload error for file:', file?.name, error, response);
        };
        const restrictionFailedHandler = (file: any, error: any) => {
            console.warn('Uppy restriction failed:', file?.name, error);
        };

        uppy.on('error', errorHandler);
        uppy.on('upload-error', uploadErrorHandler);
        uppy.on('restriction-failed', restrictionFailedHandler);

        return () => {
            uppy.off('upload-success', handler);
            uppy.off('error', errorHandler);
            uppy.off('upload-error', uploadErrorHandler);
            uppy.off('restriction-failed', restrictionFailedHandler);
        };
    }, [uppy, apiUrl, getToken, onUploadSuccess, onError]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Dashboard
                uppy={uppy}
                theme={theme}
                width={width}
                height={height}
                hideUploadButton={false}
                proudlyDisplayPoweredByUppy={false}
            />
        </div>
    );
};
