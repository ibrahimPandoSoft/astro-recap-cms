import type { AstroIntegration, AstroUserConfig } from "astro";
import type { CmsConfig } from "netlify-cms-core";
import { spawn } from "node:child_process";
import type { PreviewStyle } from "./types.js";
import AdminDashboard from "./vite-plugin-admin-dashboard.js";

const widgetPath = "astro-recap-cms/identity-widget";

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

export default function RecapCMS({
  disableIdentityWidgetInjection = false,
  adminPath = "/admin",
  config: cmsConfig,
  previewStyles = [],
}: RecapCMSOptions) {
  if (!adminPath.startsWith("/")) {
    throw new Error(
      '`adminPath` option must be a root-relative pathname, starting with "/", got "' +
        adminPath +
        '"'
    );
  }
  if (adminPath.endsWith("/")) {
    adminPath = adminPath.slice(0, -1);
  }

  let proxy: ReturnType<typeof spawn>;

  const RecapCMSIntegration: AstroIntegration = {
    name: "recap-cms",
    hooks: {
      "astro:config:setup": ({
        config,
        injectRoute,
        injectScript,
        updateConfig,
      }) => {
        console.log("Setting up Recap CMS integration");
        console.log(
          "config.site || process.env.URL",
          config.site || process.env.URL
        );
        console.log("config.integrations", config.integrations);

        // const identityWidgetScript = `import { initIdentity } from '${widgetPath}'; initIdentity('${adminPath}');`;
        const newConfig: AstroUserConfig = {
          // Default to the URL provided by Recap when building there. See:
          // https://docs.recap.com/configure-builds/environment-variables/#deploy-urls-and-metadata
          site: config.site || process.env.URL,
          vite: {
            plugins: [
              ...(config.vite?.plugins || []),
              AdminDashboard({
                config: cmsConfig,
                previewStyles,
                // identityWidget: disableIdentityWidgetInjection
                //   ? identityWidgetScript
                //   : "",
              }),
            ],
          },
        };
        updateConfig(newConfig);

        injectRoute({
          pattern: adminPath,
          entryPoint: "astro-recap-cms/admin-dashboard.astro",
        });

        // if (!disableIdentityWidgetInjection) {
        //   injectScript("page", identityWidgetScript);
        // }
      },

      "astro:config:done": ({ config }) => {
        console.log("astro:config:done...");
        console.log("config ==>", config);
        console.log("config.integrations", config.integrations);
      },
      "astro:server:start": () => {
        proxy = spawn("pnpx", ["netlify-cms-proxy-server"], {
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
  return RecapCMSIntegration;
}
