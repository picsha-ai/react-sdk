import React from 'react';

export interface TextOverlay {
    type: 'text';
    text: string;
    color?: string;
    font?: string;
    size?: number;
    gravity?: 'top' | 'right' | 'bottom' | 'left' | 'center' | 'northeast' | 'southeast' | 'southwest' | 'northwest';
    x?: number | string;
    y?: number | string;
    shadow?: string;
    outline?: string;
    bgColor?: string;
}

export interface ImageOverlay {
    type: 'image';
    assetId?: string;
    remoteUrl?: string;
    width?: number;
    height?: number;
    gravity?: 'top' | 'right' | 'bottom' | 'left' | 'center' | 'northeast' | 'southeast' | 'southwest' | 'northwest';
    x?: number;
    y?: number;
    blend?: string;
}

export type OverlayConfig = TextOverlay | ImageOverlay;

export interface PicshaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    deliveryEndpoint: string;
    imageDeliveryEndpoint?: string;
    assetId?: string;
    url?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    blur?: number;
    radius?: number | 'max';
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'mp4' | 'webm' | 'gif' | 'auto';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    crop?: string;
    quality?: number;
    position?: 'top' | 'right' | 'bottom' | 'left' | 'center' | 'northeast' | 'southeast' | 'southwest' | 'northwest' | 'entropy' | 'attention' | 'face';
    background?: string;
    removeBackground?: boolean;
    generativeRemove?: string;
    overlays?: OverlayConfig[];
    kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    force?: boolean;
    cb?: string;
}

export const PicshaImage: React.FC<PicshaImageProps> = ({
    deliveryEndpoint,
    imageDeliveryEndpoint,
    assetId,
    url,
    width,
    height,
    aspectRatio,
    blur,
    radius,
    format,
    fit,
    crop,
    quality,
    position,
    background,
    removeBackground,
    generativeRemove,
    overlays,
    kernel,
    withoutEnlargement,
    withoutReduction,
    force,
    cb,
    ...imgProps
}) => {
    let baseUrl = deliveryEndpoint.replace(/\/+$/, '').replace(/\/v1$/, '');

    if (assetId) {
        if (imageDeliveryEndpoint) {
            baseUrl = imageDeliveryEndpoint.replace(/\/+$/, '') + `/render/${assetId}`;
        } else {
            baseUrl += `/v1/assets/${assetId}/render`;
        }
    } else if (url) {
        baseUrl += `/v1/fetch`;
    } else {
        console.warn('PicshaImage: You must provide either an assetId or a url');
        return null;
    }

    const params = new URLSearchParams();

    if (url) params.append('url', url);
    if (width !== undefined) params.append('w', width.toString());
    if (height !== undefined) params.append('h', height.toString());
    if (aspectRatio) params.append('ar', aspectRatio);
    if (blur !== undefined) params.append('blur', blur.toString());
    if (radius !== undefined) params.append('r', radius.toString());
    if (format) params.append('fmt', format);
    if (fit) params.append('fit', fit);
    if (crop) params.append('crop', crop);
    if (quality !== undefined) params.append('q', quality.toString());
    if (position) params.append('pos', position);
    if (background) params.append('bg', background);
    if (removeBackground) params.append('bg_rem', 'true');
    if (generativeRemove) params.append('gen_rem', generativeRemove);
    if (kernel) params.append('k', kernel);
    if (withoutEnlargement) params.append('no_enlarge', 'true');
    if (withoutReduction) params.append('no_reduce', 'true');
    if (force) params.append('force', 'true');
    if (cb) params.append('_cb', cb);

    if (overlays && overlays.length > 0) {
        // We use base64 encoding to keep the URL safe and beautiful
        const jsonStr = JSON.stringify(overlays);
        // Base64 encode in browser-safe way (we can use btoa, since this runs in the browser)
        try {
            const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
            params.append('o', b64);
        } catch (e) {
            console.error('PicshaImage: Failed to encode overlays', e);
        }
    }

    const queryString = params.toString();
    const finalSrc = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    return <img src={finalSrc} {...imgProps} />;
};
