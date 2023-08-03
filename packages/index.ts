import type { AstroIntegration, AstroUserConfig } from "astro";
import type { CmsConfig } from "netlify-cms-core";
import { spawn } from "node:child_process";
import type { PreviewStyle } from "./types.js";
import AdminDashboard from "./vite-plugin-admin-dashboard.js";

interface PandoWebOptions {
  /**
   * Path at which the Pando Web admin dashboard should be served.
   * @default '/pando-web-admin'
   */
  adminPath?: string;
  config: Omit<CmsConfig, "load_config_file" | "local_backend">;
  previewStyles?: PreviewStyle[];
}

export default function PandoWeb({
  adminPath = "/pando-web-admin",
  config: cmsConfig,
  previewStyles = [],
}: PandoWebOptions) {
  if (!adminPath.startsWith("/")) {
    adminPath = "/" + adminPath;
  }
  if (adminPath.endsWith("/")) {
    adminPath = adminPath.slice(0, -1);
  }

  let proxy: ReturnType<typeof spawn>;

  const PandoWebIntegration: AstroIntegration = {
    name: "pando-web",
    hooks: {
      "astro:config:setup": ({
        config,
        injectRoute,
        injectScript,
        updateConfig,
      }) => {
        const newConfig: AstroUserConfig = {
          // Default to the URL provided by Recap when building there. See:
          // https://docs.recap.com/configure-builds/environment-variables/#deploy-urls-and-metadata
          // site: config.site || process.env.URL,
          vite: {
            plugins: [
              AdminDashboard({
                config: cmsConfig,
                previewStyles,
              }),
            ],
          },
        };
        updateConfig(newConfig);

        injectRoute({
          pattern: adminPath,
          entryPoint: "astro-pando-web/admin-dashboard.astro",
        });
      },

      "astro:server:start": () => {
        // check if pnpm is used so run pnpx instead of npx
        const command = process.env.npm_execpath?.includes("pnpm")
          ? "pnpx"
          : "npx";
        proxy = spawn(command, ["netlify-cms-proxy-server"], {
          stdio: "inherit",
          // Run in shell on Windows to make sure the npm package can be found.
          shell: process.platform === "win32",
        });
        process.on("exit", () => proxy.kill());
      },

      "astro:server:done": () => {
        console.log("Shutting down Recap CMS proxy server");
        proxy.kill();
      },
    },
  };
  return PandoWebIntegration;
}
