import { ashChannel } from "experimental-ash/channels/ash";
import { localDev, none, vercelOidc } from "experimental-ash/channels/auth";

// open on localhost, OIDC on Vercel, and anonymous as a fallback so the
// starter works out of the box. tighten this with a real authenticator
// before exposing the agent publicly.
export default ashChannel({
  auth: [localDev(), vercelOidc(), none()],
});
