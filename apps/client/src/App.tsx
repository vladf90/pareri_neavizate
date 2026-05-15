import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/theme";
import { getWsClient } from "@/ws";
import { useAppStore } from "@/store";
import { env } from "@parerineavizate/shared/wsEvents";
import { 
  AdminPage, 
  OverlayStartingSoonPage,
  OverlayMasterPage,
  OverlayLiveStandingsPage,
  OverlayLiveStandingsUCL1Page,
  OverlayLiveStandingsUCL2Page,
  OverlayResolumePage,
  OverlayVersusPage,
} from "@/pages";

function AdminWrapper() {
  const handleServerMessage = useAppStore((s) => s.handleServerMessage);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const wsInitialized = useRef(false);

  useEffect(() => {
    // Only initialize WebSocket once
    if (wsInitialized.current) return;
    wsInitialized.current = true;

    const ws = getWsClient();

    // Set hello message for admin
    ws.setHelloMessage(
      env("admin:hello", {
        role: "admin",
        clientId: `admin_${Date.now()}`,
      })
    );

    ws.onMessage(handleServerMessage);
    ws.onStatusChange(setConnectionStatus);
    ws.connect();

    // Don't disconnect on unmount - let the WS client handle reconnection
    // return () => ws.disconnect();
  }, []); // Empty deps - only run once

  return <AdminPage />;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminWrapper />} />
          
          {/* Overlay Routes - 16:9 */}
          <Route path="/overlay/master" element={<OverlayMasterPage />} />
          <Route path="/overlay/startingsoon" element={<OverlayStartingSoonPage />} />
          <Route path="/overlay/versus" element={<OverlayVersusPage />} />
          
          {/* Overlay Routes - 9:16 Vertical */}
          <Route path="/overlay/livestandings" element={<OverlayLiveStandingsPage />} />
          <Route path="/overlay/livestandings-ucl1" element={<OverlayLiveStandingsUCL1Page />} />
          <Route path="/overlay/livestandings-ucl2" element={<OverlayLiveStandingsUCL2Page />} />
          
          {/* Resolume Multi-Display */}
          <Route path="/overlay/resolume" element={<OverlayResolumePage />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}
