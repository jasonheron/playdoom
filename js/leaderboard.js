import { mountNav } from "./nav.js";
import { refreshPit, bindPitWalletRepaint } from "./pit.js";

mountNav("leaderboard");
bindPitWalletRepaint();
refreshPit({ limit: 25 });
setInterval(() => refreshPit({ limit: 25 }), 20000);
