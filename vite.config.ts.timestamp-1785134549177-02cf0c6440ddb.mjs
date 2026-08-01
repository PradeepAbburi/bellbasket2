// vite.config.ts
import { defineConfig } from "file:///C:/Users/dines/OneDrive/Desktop/PROJECTS/bellbasket-local-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/dines/OneDrive/Desktop/PROJECTS/bellbasket-local-main/node_modules/@vitejs/plugin-react-swc/index.js";
import legacy from "file:///C:/Users/dines/OneDrive/Desktop/PROJECTS/bellbasket-local-main/node_modules/@vitejs/plugin-legacy/dist/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/dines/OneDrive/Desktop/PROJECTS/bellbasket-local-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\dines\\OneDrive\\Desktop\\PROJECTS\\bellbasket-local-main";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    {
      name: "local-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith("/api/")) {
            try {
              const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
              const pathname = parsedUrl.pathname;
              const apiFileName = pathname.substring(5);
              const fs = await import("fs");
              const path2 = await import("path");
              const jsPath = path2.resolve(process.cwd(), "api", `${apiFileName}.js`);
              const tsPath = path2.resolve(process.cwd(), "api", `${apiFileName}.ts`);
              let filePath = "";
              if (fs.existsSync(jsPath)) {
                filePath = jsPath;
              } else if (fs.existsSync(tsPath)) {
                filePath = tsPath;
              } else {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: `API endpoint ${pathname} not found` }));
                return;
              }
              let normalizedPath = filePath.replace(/\\/g, "/");
              if (!normalizedPath.startsWith("/")) {
                normalizedPath = "/" + normalizedPath;
              }
              const fileUrl = `file://${normalizedPath}`;
              const handlerModule = await import(fileUrl);
              const handler = handlerModule.default || handlerModule;
              if (typeof handler !== "function") {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: `API handler at ${pathname} is not a function` }));
                return;
              }
              const query = {};
              for (const [key, val] of parsedUrl.searchParams.entries()) {
                query[key] = val;
              }
              req.query = query;
              if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
                const bodyText = await new Promise((resolve) => {
                  let body = "";
                  req.on("data", (chunk) => {
                    body += chunk;
                  });
                  req.on("end", () => {
                    resolve(body);
                  });
                });
                try {
                  req.body = JSON.parse(bodyText);
                } catch (e) {
                  req.body = {};
                }
              } else {
                req.body = {};
              }
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                if (!res.writableEnded) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                }
                return res;
              };
              await handler(req, res);
            } catch (err) {
              console.error(`Vite local API middleware error for ${req.url}:`, err);
              if (!res.writableEnded) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Internal Server Error", details: err.message }));
              }
            }
          } else {
            next();
          }
        });
      }
    },
    react(),
    legacy({
      targets: ["ios >= 12", "chrome >= 70", "android >= 6"],
      modernPolyfills: true
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    target: "es2015",
    minify: "esbuild",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["framer-motion", "@radix-ui/react-accordion", "@radix-ui/react-dialog", "lucide-react"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          "vendor-charts": ["recharts"],
          "vendor-maps": ["leaflet", "leaflet-routing-machine"],
          "vendor-utils": ["date-fns", "zod", "i18next"]
        }
      }
    }
  },
  esbuild: {
    drop: mode === "production" ? ["debugger"] : []
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkaW5lc1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFBST0pFQ1RTXFxcXGJlbGxiYXNrZXQtbG9jYWwtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZGluZXNcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxQUk9KRUNUU1xcXFxiZWxsYmFza2V0LWxvY2FsLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RpbmVzL09uZURyaXZlL0Rlc2t0b3AvUFJPSkVDVFMvYmVsbGJhc2tldC1sb2NhbC1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IGxlZ2FjeSBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tbGVnYWN5XCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgICBobXI6IHtcclxuICAgICAgb3ZlcmxheTogZmFsc2UsXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAge1xyXG4gICAgICBuYW1lOiAnbG9jYWwtYXBpJyxcclxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogaW1wb3J0KCd2aXRlJykuVml0ZURldlNlcnZlcikge1xyXG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoYXN5bmMgKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSA9PiB7XHJcbiAgICAgICAgICBpZiAocmVxLnVybCAmJiByZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvJykpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBwYXJzZWRVcmwgPSBuZXcgVVJMKHJlcS51cmwsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0IHx8ICdsb2NhbGhvc3QnfWApO1xyXG4gICAgICAgICAgICAgIGNvbnN0IHBhdGhuYW1lID0gcGFyc2VkVXJsLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIE1hcCAvYXBpL3h5eiB0byAuL2FwaS94eXouanMgb3IgLnRzXHJcbiAgICAgICAgICAgICAgY29uc3QgYXBpRmlsZU5hbWUgPSBwYXRobmFtZS5zdWJzdHJpbmcoNSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgY29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoJ2ZzJyk7XHJcbiAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGF3YWl0IGltcG9ydCgncGF0aCcpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGNvbnN0IGpzUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnYXBpJywgYCR7YXBpRmlsZU5hbWV9LmpzYCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgdHNQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdhcGknLCBgJHthcGlGaWxlTmFtZX0udHNgKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBsZXQgZmlsZVBhdGggPSAnJztcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhqc1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IGpzUGF0aDtcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZzLmV4aXN0c1N5bmModHNQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGggPSB0c1BhdGg7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYEFQSSBlbmRwb2ludCAke3BhdGhuYW1lfSBub3QgZm91bmRgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGxldCBub3JtYWxpemVkUGF0aCA9IGZpbGVQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcclxuICAgICAgICAgICAgICBpZiAoIW5vcm1hbGl6ZWRQYXRoLnN0YXJ0c1dpdGgoJy8nKSkge1xyXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZFBhdGggPSAnLycgKyBub3JtYWxpemVkUGF0aDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgY29uc3QgZmlsZVVybCA9IGBmaWxlOi8vJHtub3JtYWxpemVkUGF0aH1gO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXJNb2R1bGUgPSBhd2FpdCBpbXBvcnQoZmlsZVVybCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IGhhbmRsZXJNb2R1bGUuZGVmYXVsdCB8fCBoYW5kbGVyTW9kdWxlO1xyXG5cclxuICAgICAgICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYEFQSSBoYW5kbGVyIGF0ICR7cGF0aG5hbWV9IGlzIG5vdCBhIGZ1bmN0aW9uYCB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBjb25zdCBxdWVyeTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBwYXJzZWRVcmwuc2VhcmNoUGFyYW1zLmVudHJpZXMoKSkge1xyXG4gICAgICAgICAgICAgICAgcXVlcnlba2V5XSA9IHZhbDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgKHJlcSBhcyBhbnkpLnF1ZXJ5ID0gcXVlcnk7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgfHwgcmVxLm1ldGhvZCA9PT0gJ1BVVCcgfHwgcmVxLm1ldGhvZCA9PT0gJ1BBVENIJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYm9keVRleHQgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGxldCBib2R5ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgIHJlcS5vbignZGF0YScsIChjaHVuazogYW55KSA9PiB7IGJvZHkgKz0gY2h1bms7IH0pO1xyXG4gICAgICAgICAgICAgICAgICByZXEub24oJ2VuZCcsICgpID0+IHsgcmVzb2x2ZShib2R5KTsgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIChyZXEgYXMgYW55KS5ib2R5ID0gSlNPTi5wYXJzZShib2R5VGV4dCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIChyZXEgYXMgYW55KS5ib2R5ID0ge307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIChyZXEgYXMgYW55KS5ib2R5ID0ge307XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAocmVzIGFzIGFueSkuc3RhdHVzID0gKGNvZGU6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBjb2RlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIChyZXMgYXMgYW55KS5qc29uID0gKGRhdGE6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMud3JpdGFibGVFbmRlZCkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XHJcbiAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgYXdhaXQgaGFuZGxlcihyZXEsIHJlcyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgVml0ZSBsb2NhbCBBUEkgbWlkZGxld2FyZSBlcnJvciBmb3IgJHtyZXEudXJsfTpgLCBlcnIpO1xyXG4gICAgICAgICAgICAgIGlmICghcmVzLndyaXRhYmxlRW5kZWQpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIFNlcnZlciBFcnJvcicsIGRldGFpbHM6IGVyci5tZXNzYWdlIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHJlYWN0KCksXHJcbiAgICBsZWdhY3koe1xyXG4gICAgICB0YXJnZXRzOiBbJ2lvcyA+PSAxMicsICdjaHJvbWUgPj0gNzAnLCAnYW5kcm9pZCA+PSA2J10sXHJcbiAgICAgIG1vZGVyblBvbHlmaWxsczogdHJ1ZSxcclxuICAgIH0pLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpXHJcbiAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHRhcmdldDogXCJlczIwMTVcIixcclxuICAgIG1pbmlmeTogXCJlc2J1aWxkXCIsXHJcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXHJcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICd2ZW5kb3ItdWknOiBbJ2ZyYW1lci1tb3Rpb24nLCAnQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvbicsICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ2x1Y2lkZS1yZWFjdCddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1maXJlYmFzZSc6IFsnZmlyZWJhc2UvYXBwJywgJ2ZpcmViYXNlL2F1dGgnLCAnZmlyZWJhc2UvZmlyZXN0b3JlJywgJ2ZpcmViYXNlL3N0b3JhZ2UnXSxcclxuICAgICAgICAgICd2ZW5kb3ItY2hhcnRzJzogWydyZWNoYXJ0cyddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1tYXBzJzogWydsZWFmbGV0JywgJ2xlYWZsZXQtcm91dGluZy1tYWNoaW5lJ10sXHJcbiAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydkYXRlLWZucycsICd6b2QnLCAnaTE4bmV4dCddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgZXNidWlsZDoge1xyXG4gICAgZHJvcDogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8gWydkZWJ1Z2dlciddIDogW10sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBYLFNBQVMsb0JBQW9CO0FBQ3ZaLE9BQU8sV0FBVztBQUNsQixPQUFPLFlBQVk7QUFDbkIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSmhDLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElB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QjtBQUNoRCxzQkFBSSxJQUFJLEtBQUssVUFBVSxJQUFJLENBQUM7QUFBQSxnQkFDOUI7QUFDQSx1QkFBTztBQUFBLGNBQ1Q7QUFFQSxvQkFBTSxRQUFRLEtBQUssR0FBRztBQUFBLFlBQ3hCLFNBQVMsS0FBVTtBQUNqQixzQkFBUSxNQUFNLHVDQUF1QyxJQUFJLEdBQUcsS0FBSyxHQUFHO0FBQ3BFLGtCQUFJLENBQUMsSUFBSSxlQUFlO0FBQ3RCLG9CQUFJLGFBQWE7QUFDakIsb0JBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELG9CQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsT0FBTyx5QkFBeUIsU0FBUyxJQUFJLFFBQVEsQ0FBQyxDQUFDO0FBQUEsY0FDbEY7QUFBQSxZQUNGO0FBQUEsVUFDRixPQUFPO0FBQ0wsaUJBQUs7QUFBQSxVQUNQO0FBQUEsUUFDRixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxJQUNBLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFNBQVMsQ0FBQyxhQUFhLGdCQUFnQixjQUFjO0FBQUEsTUFDckQsaUJBQWlCO0FBQUEsSUFDbkIsQ0FBQztBQUFBLElBQ0QsU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsRUFDNUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixjQUFjO0FBQUEsSUFDZCxzQkFBc0I7QUFBQSxJQUN0Qix1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDekQsYUFBYSxDQUFDLGlCQUFpQiw2QkFBNkIsMEJBQTBCLGNBQWM7QUFBQSxVQUNwRyxtQkFBbUIsQ0FBQyxnQkFBZ0IsaUJBQWlCLHNCQUFzQixrQkFBa0I7QUFBQSxVQUM3RixpQkFBaUIsQ0FBQyxVQUFVO0FBQUEsVUFDNUIsZUFBZSxDQUFDLFdBQVcseUJBQXlCO0FBQUEsVUFDcEQsZ0JBQWdCLENBQUMsWUFBWSxPQUFPLFNBQVM7QUFBQSxRQUMvQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTSxTQUFTLGVBQWUsQ0FBQyxVQUFVLElBQUksQ0FBQztBQUFBLEVBQ2hEO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
