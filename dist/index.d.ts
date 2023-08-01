import type { AstroIntegration } from "astro";
import type { CmsConfig } from "netlify-cms-core";
import type { PreviewStyle } from "./types.js";
interface RecapCMSOptions {
    /**
     * Path at which the Recap CMS admin dashboard should be served.
     * @default '/admin'
     */
    adminPath?: string;
    config: Omit<CmsConfig, "load_config_file" | "local_backend">;
    disableIdentityWidgetInjection?: boolean;
    previewStyles?: PreviewStyle[];
}
export default function RecapCMS({ disableIdentityWidgetInjection, adminPath, config: cmsConfig, previewStyles, }: RecapCMSOptions): AstroIntegration;
export {};
