// vite.config.ts
import { defineConfig, loadEnv } from "file:///D:/capstone-project-revisi-2/sistem-evaluasi-pkkmb/website/feedback-insight-main/node_modules/vite/dist/node/index.js";
import react from "file:///D:/capstone-project-revisi-2/sistem-evaluasi-pkkmb/website/feedback-insight-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/capstone-project-revisi-2/sistem-evaluasi-pkkmb/website/feedback-insight-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "D:\\capstone-project-revisi-2\\sistem-evaluasi-pkkmb\\website\\feedback-insight-main";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sentimentApiUrl = env.VITE_SENTIMENT_API_URL || "https://shininess-yeah-ignore.ngrok-free.dev";
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      },
      proxy: {
        "/api-sentiment": {
          target: sentimentApiUrl,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api-sentiment/, "")
        }
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxjYXBzdG9uZS1wcm9qZWN0LXJldmlzaS0yXFxcXHNpc3RlbS1ldmFsdWFzaS1wa2ttYlxcXFx3ZWJzaXRlXFxcXGZlZWRiYWNrLWluc2lnaHQtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcY2Fwc3RvbmUtcHJvamVjdC1yZXZpc2ktMlxcXFxzaXN0ZW0tZXZhbHVhc2ktcGtrbWJcXFxcd2Vic2l0ZVxcXFxmZWVkYmFjay1pbnNpZ2h0LW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L2NhcHN0b25lLXByb2plY3QtcmV2aXNpLTIvc2lzdGVtLWV2YWx1YXNpLXBra21iL3dlYnNpdGUvZmVlZGJhY2staW5zaWdodC1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgXCJcIik7XG4gIGNvbnN0IHNlbnRpbWVudEFwaVVybCA9IGVudi5WSVRFX1NFTlRJTUVOVF9BUElfVVJMIHx8IFwiaHR0cHM6Ly9zaGluaW5lc3MteWVhaC1pZ25vcmUubmdyb2stZnJlZS5kZXZcIjtcblxuICByZXR1cm4ge1xuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCI6OlwiLFxuICAgICAgcG9ydDogODA4MCxcbiAgICAgIGhtcjoge1xuICAgICAgICBvdmVybGF5OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBwcm94eToge1xuICAgICAgICBcIi9hcGktc2VudGltZW50XCI6IHtcbiAgICAgICAgICB0YXJnZXQ6IHNlbnRpbWVudEFwaVVybCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS1zZW50aW1lbnQvLCBcIlwiKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICB9LFxuICAgICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0L2pzeC1ydW50aW1lXCIsIFwicmVhY3QvanN4LWRldi1ydW50aW1lXCIsIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCIsIFwiQHRhbnN0YWNrL3F1ZXJ5LWNvcmVcIl0sXG4gICAgfSxcbiAgfTtcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRhLFNBQVMsY0FBYyxlQUFlO0FBQ2xkLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sa0JBQWtCLElBQUksMEJBQTBCO0FBRXRELFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxrQkFBa0I7QUFBQSxVQUNoQixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxvQkFBb0IsRUFBRTtBQUFBLFFBQ3hEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxJQUM5RSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxNQUNBLFFBQVEsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLHlCQUF5Qix5QkFBeUIsc0JBQXNCO0FBQUEsSUFDOUg7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
