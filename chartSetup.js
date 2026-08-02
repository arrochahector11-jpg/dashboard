import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export const NAVY = "#0f2540";
export const NAVY_LIGHT = "#3a5a80";
export const ORANGE = "#e8823a";
export const ORANGE_LIGHT = "#f5a662";

export const PALETTE = [
  "#0f2540", "#e8823a", "#3a5a80", "#f5a662", "#1a3a5c",
  "#f0a878", "#264d73", "#e89c66", "#4a6d94", "#d97840",
];
