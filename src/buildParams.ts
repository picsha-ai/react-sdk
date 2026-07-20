/**
 * Pure, isomorphic construction of the delivery query parameters that
 * <PicshaImage> emits. Exported so SERVER code can build the exact same
 * key/value set when minting a delivery signature:
 *
 *   // server (Node) — sign the same permutation the component will render
 *   const queryParams = buildPicshaQueryParams({ width: 800, mimi: 'sunset' });
 *   const { signature } = await picsha.post(`/assets/${id}/sign-delivery`, {
 *       urlPath: `/v1/assets/${id}/render`,
 *       queryParams,
 *   });
 *   // client
 *   <PicshaImage deliveryEndpoint="..." assetId={id} width={800} mimi="sunset" sig={signature} />
 *
 * The signature canonicalization sorts keys, so only the key/value SET must
 * match — not the order. If any prop differs from what was signed, the
 * signature breaks and the CDN refuses the request.
 */

import type { OverlayConfig } from './components/PicshaImage';

export interface PicshaTransformProps {
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
    mimi?: string;
    mimiMode?: 'lite' | 'standard' | '4k';
    upscale?: '2k' | '4k';
    mimiBg?: string;
    overlays?: OverlayConfig[];
    kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    force?: boolean;
    cb?: string;
}

/** UTF-8 → base64 in both browser (btoa) and Node (Buffer). */
function toBase64(str: string): string {
    if (typeof btoa === 'function') {
        return btoa(unescape(encodeURIComponent(str)));
    }
    return Buffer.from(str, 'utf-8').toString('base64');
}

/** True when the props trigger a billed generative operation (requires auth or a signed URL). */
export function hasGenerativeParams(props: PicshaTransformProps): boolean {
    return Boolean(props.mimi || props.mimiBg || props.generativeRemove || props.removeBackground);
}

/** Build the decoded key/value set for these props — the exact set to pass as sign-delivery's `queryParams`. */
export function buildPicshaQueryParams(props: PicshaTransformProps): Record<string, string> {
    const p: Record<string, string> = {};

    if (props.url) p.url = props.url;
    if (props.width !== undefined) p.w = props.width.toString();
    if (props.height !== undefined) p.h = props.height.toString();
    if (props.aspectRatio) p.ar = props.aspectRatio;
    if (props.blur !== undefined) p.blur = props.blur.toString();
    if (props.radius !== undefined) p.r = props.radius.toString();
    if (props.format) p.fmt = props.format;
    if (props.fit) p.fit = props.fit;
    if (props.crop) p.crop = props.crop;
    if (props.quality !== undefined) p.q = props.quality.toString();
    if (props.position) p.pos = props.position;
    if (props.background) p.bg = props.background;
    if (props.removeBackground) p.bg_rem = 'true';
    if (props.generativeRemove) p.gen_rem = props.generativeRemove;
    if (props.mimi) p.mimi = props.mimi;
    if (props.mimiMode) p.mimi_mode = props.mimiMode;
    if (props.upscale) p.upscale = props.upscale;
    if (props.mimiBg) p.mimi_bg = props.mimiBg;
    if (props.kernel) p.k = props.kernel;
    if (props.withoutEnlargement) p.no_enlarge = 'true';
    if (props.withoutReduction) p.no_reduce = 'true';
    if (props.force) p.force = 'true';
    if (props.cb) p._cb = props.cb;

    if (props.overlays && props.overlays.length > 0) {
        try {
            p.o = toBase64(JSON.stringify(props.overlays));
        } catch (e) {
            console.error('Picsha: Failed to encode overlays', e);
        }
    }

    return p;
}
