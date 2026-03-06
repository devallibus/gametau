export interface MissionStubConfig {
  callsign: string;
  sector: string;
  objective: string;
  intel: string;
  tacticalProtocol: string[];
}

export interface ThemeConfig {
  scene: SceneTheme;
  audio: {
    hitHz: number;
    killConfirmHz: number;
    missHz: number;
    integrityLossHz: number;
    criticalAlertHz: number;
  };
  ui: {
    criticalIntegrityThreshold: number;
  };
}

export interface SceneTheme {
  background: string;
  grid: string;
  selected: string;
  shipColor: string;
  friendlyColor: string;
  contactPulseSpeed?: number;
  contactPulseAmount?: number;
}

export const FALLBACK_MISSION: MissionStubConfig = {
  callsign: "LANCE-130",
  sector: "Outer Grid Delta-7",
  objective: "Defend friendly cluster from approaching hostiles.",
  intel: "No mission config found. Using fallback profile.",
  tacticalProtocol: [],
};

export const FALLBACK_THEME: ThemeConfig = {
  scene: {
    background: "#030608",
    grid: "#1a3040",
    selected: "#ffe680",
    shipColor: "#00e5ff",
    friendlyColor: "#22cc44",
  },
  audio: {
    hitHz: 660,
    killConfirmHz: 880,
    missHz: 220,
    integrityLossHz: 160,
    criticalAlertHz: 120,
  },
  ui: {
    criticalIntegrityThreshold: 25,
  },
};
