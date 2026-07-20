import React from 'react';
import { buildPicshaQueryParams, hasGenerativeParams } from '../buildParams';

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
    /** MIMI natural-language edit prompt (standard 2K tier by default). */
    mimi?: string;
    /** MIMI quality tier: 'lite' (fast 1K), 'standard' (2K, default), '4k' (native 4K). */
    mimiMode?: 'lite' | 'standard' | '4k';
    /** Free preview-faithful export upscale, one tier up: '4k' on standard, '2k' on lite. */
    upscale?: '2k' | '4k';
    /** MIMI generative background swap prompt — subject preserved, background generated. */
    mimiBg?: string;
    overlays?: OverlayConfig[];
    kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    force?: boolean;
    cb?: string;
    /**
     * Delivery signature for generative props (mimi, mimiBg, generativeRemove,
     * removeBackground) — anonymous generative requests are rejected with 401.
     * Mint it server-side via POST /v1/assets/{id}/sign-delivery, passing
     * `buildPicshaQueryParams(props)` as queryParams so the signed permutation
     * matches this component's URL exactly. Appended verbatim as `sig`.
     */
    sig?: string;
    /**
     * A complete, already-signed delivery URL (e.g. sign-delivery's signedUrl,
     * prefixed with your delivery origin). When set, it is rendered as-is and
     * every other transformation prop is ignored — the simplest correct way to
     * show a generative render on a public page.
     */
    signedUrl?: string;
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
    mimi,
    mimiMode,
    upscale,
    mimiBg,
    overlays,
    kernel,
    withoutEnlargement,
    withoutReduction,
    force,
    cb,
    sig,
    signedUrl,
    ...imgProps
}) => {
    // A pre-signed URL is authoritative: render it untouched so the signature
    // (which covers the exact query permutation) cannot be invalidated.
    if (signedUrl) {
        return <img src={signedUrl} {...imgProps} />;
    }

    let baseUrl = deliveryEndpoint.replace(/\/+$/, '').replace(/\/v1$/, '');

    if (assetId) {
        if (imageDeliveryEndpoint) {
            baseUrl = imageDeliveryEndpoint.replace(/\/+$/, '') + `/render/${assetId}`;
        } else {
            baseUrl += `/v1/assets/${assetId}/render`;
        }
    } else if (url) {
        baseUrl += `/v1/fetch`;
        console.warn(
            'PicshaImage: the `url` prop proxies through /v1/fetch, which requires authentication ' +
            'and cannot be called from the browser. Ingest the external URL server-side instead ' +
            '(POST /v1/assets with a url), or point deliveryEndpoint at your own authenticated proxy.'
        );
    } else {
        console.warn('PicshaImage: You must provide either an assetId or a url');
        return null;
    }

    const transformProps = {
        url, width, height, aspectRatio, blur, radius, format, fit, crop,
        quality, position, background, removeBackground, generativeRemove,
        mimi, mimiMode, upscale, mimiBg, overlays, kernel,
        withoutEnlargement, withoutReduction, force, cb,
    };

    if (hasGenerativeParams(transformProps) && !sig) {
        console.warn(
            'PicshaImage: generative props (mimi, mimiBg, generativeRemove, removeBackground) require ' +
            'authorization — anonymous requests are rejected with 401. Mint a signature server-side via ' +
            'POST /v1/assets/{id}/sign-delivery (use buildPicshaQueryParams to match this exact permutation) ' +
            'and pass it as the `sig` prop, or pass the full `signedUrl`.'
        );
    }

    const params = new URLSearchParams(buildPicshaQueryParams(transformProps));
    if (sig) params.append('sig', sig);

    const queryString = params.toString();
    const finalSrc = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    return <img src={finalSrc} {...imgProps} />;
};
