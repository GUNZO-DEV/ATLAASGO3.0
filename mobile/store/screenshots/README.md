# Play Store screenshots

Draft phone screenshots captured from the Android emulator (1080×2400, clean
status bar via systemui demo mode). They satisfy Play's spec (2–8 phone shots,
PNG, 9:16 portrait, 320–3840 px) and are ready to upload as a first listing.

| File | Screen |
|---|---|
| `01-home.png` | Home — verticals, "what are you craving?", local-legend hero (Ifrane) |
| `02-search.png` | Search — trending + Browse-by-craving grid |
| `03-home-taourirt.png` | Home in a second city (Taourirt) — alternate |

**For final submission, re-shoot from the *release* AAB**, not the dev client —
Play wants release-quality and these carry test data. Recommended 5–6 set:
**Home · Restaurant menu · Cart · Checkout/Payment · Live order tracking · Wallet**.

Clean status bar for re-shoots:
```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# … capture …
adb shell am broadcast -a com.android.systemui.demo -e command exit
```
