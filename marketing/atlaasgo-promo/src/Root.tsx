import "./index.css";
import { Composition } from "remotion";
import { AtlaasGoPromo } from "./AtlaasGoPromo";
import { LandmarkClip } from "./LandmarkClip";
import { SnowClip } from "./SnowClip";
import { GlovoClip } from "./GlovoClip";
import { LandmarkMemeClip } from "./LandmarkMemeClip";
import { SnowMemeClip } from "./SnowMemeClip";
import { DormClip } from "./DormClip";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AtlaasGoPromo"
        component={AtlaasGoPromo}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 12s — "Forget the address, drop a landmark" USP clip */}
      <Composition
        id="LandmarkClip"
        component={LandmarkClip}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 12s — "It's freezing in Ifrane" cold-weather hook clip */}
      <Composition
        id="SnowClip"
        component={SnowClip}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── TikTok meme clips (Latin-darija) · 11s · silent (add a trending sound in TikTok) ── */}
      <Composition id="GlovoClip" component={GlovoClip} durationInFrames={330} fps={30} width={1080} height={1920} />
      <Composition id="LandmarkMemeClip" component={LandmarkMemeClip} durationInFrames={330} fps={30} width={1080} height={1920} />
      <Composition id="SnowMemeClip" component={SnowMemeClip} durationInFrames={330} fps={30} width={1080} height={1920} />
      <Composition id="DormClip" component={DormClip} durationInFrames={330} fps={30} width={1080} height={1920} />
    </>
  );
};
