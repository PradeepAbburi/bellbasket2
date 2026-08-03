import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    {
      name: 'local-api',
      configureServer(server: import('vite').ViteDevServer) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const pathname = parsedUrl.pathname;
              
              // Map /api/xyz to ./api/xyz.js or .ts
              const apiFileName = pathname.substring(5);
              
              const fs = await import('fs');
              const path = await import('path');
              
              const jsPath = path.resolve(process.cwd(), 'api', `${apiFileName}.js`);
              const tsPath = path.resolve(process.cwd(), 'api', `${apiFileName}.ts`);
              
              let filePath = '';
              if (fs.existsSync(jsPath)) {
                filePath = jsPath;
              } else if (fs.existsSync(tsPath)) {
                filePath = tsPath;
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `API endpoint ${pathname} not found` }));
                return;
              }

              let normalizedPath = filePath.replace(/\\/g, '/');
              if (!normalizedPath.startsWith('/')) {
                normalizedPath = '/' + normalizedPath;
              }
              const fileUrl = `file://${normalizedPath}`;
              
              const handlerModule = await import(fileUrl);
              const handler = handlerModule.default || handlerModule;

              if (typeof handler !== 'function') {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `API handler at ${pathname} is not a function` }));
                return;
              }

              const query: Record<string, string> = {};
              for (const [key, val] of parsedUrl.searchParams.entries()) {
                query[key] = val;
              }
              (req as any).query = query;

              if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                const bodyText = await new Promise<string>((resolve) => {
                  let body = '';
                  req.on('data', (chunk: any) => { body += chunk; });
                  req.on('end', () => { resolve(body); });
                });
                try {
                  (req as any).body = JSON.parse(bodyText);
                } catch (e) {
                  (req as any).body = {};
                }
              } else {
                (req as any).body = {};
              }

              (res as any).status = (code: number) => {
                res.statusCode = code;
                return res;
              };
              (res as any).json = (data: any) => {
                if (!res.writableEnded) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                }
                return res;
              };

              await handler(req, res);
            } catch (err: any) {
              console.error(`Vite local API middleware error for ${req.url}:`, err);
              if (!res.writableEnded) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
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
      targets: ['ios >= 12', 'chrome >= 70', 'android >= 6'],
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2015",
    minify: "esbuild",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-ui': ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['leaflet', 'leaflet-routing-machine'],
          'vendor-utils': ['date-fns', 'zod', 'i18next'],
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
