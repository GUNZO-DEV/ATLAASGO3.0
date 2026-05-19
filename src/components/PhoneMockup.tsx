import { type RefObject } from 'react';
import * as I from '../icons/Icon';

export default function PhoneMockup({ phoneRef }: { phoneRef: RefObject<HTMLDivElement> }) {
  return (
    <div className="phone" ref={phoneRef} id="phoneEl">
      <div className="phone-screen">
        <div className="phone-notch" />
        <div className="phone-app">
          <div className="phone-statusbar">
            <span>9:41</span>
            <span className="sb-right">
              <I.Signal size={10} />
              <I.Wifi size={11} />
              <I.Battery size={14} />
            </span>
          </div>
          <div className="phone-hero">
            <div className="phone-greeting">Good morning, Yasmine ☀</div>
            <div className="phone-title">
              Where to eat
              <br />
              in Ifrane today?
            </div>
          </div>
          <div className="phone-search">
            <I.Search size={12} />
            <span>Search restaurants, dishes…</span>
            <I.Mic size={12} />
          </div>
          <div className="phone-chips">
            <div className="phone-chip active">All</div>
            <div className="phone-chip">Moroccan</div>
            <div className="phone-chip">Italian</div>
            <div className="phone-chip">Cafés</div>
            <div className="phone-chip">Pizza</div>
          </div>
          <div className="phone-cards">
            <div className="phone-card">
              <div className="phone-card-img" />
              <div className="phone-card-info">
                <div className="phone-card-name">Café Hassan</div>
                <div className="phone-card-meta">
                  <I.Star size={9} /> 4.9
                  <span className="dot" /> 18 min
                  <span className="dot" /> 12 dh
                </div>
              </div>
              <div className="phone-card-price">35 dh</div>
            </div>
            <div className="phone-card">
              <div className="phone-card-img v2" />
              <div className="phone-card-info">
                <div className="phone-card-name">Atlas Grill</div>
                <div className="phone-card-meta">
                  <I.Star size={9} /> 4.8
                  <span className="dot" /> 24 min
                  <span className="dot" /> Free
                </div>
              </div>
              <div className="phone-card-price">68 dh</div>
            </div>
            <div className="phone-card">
              <div className="phone-card-img v3" />
              <div className="phone-card-info">
                <div className="phone-card-name">La Paix Pizzeria</div>
                <div className="phone-card-meta">
                  <I.Star size={9} /> 4.7
                  <span className="dot" /> 16 min
                  <span className="dot" /> 8 dh
                </div>
              </div>
              <div className="phone-card-price">52 dh</div>
            </div>
          </div>
          <div className="phone-tabbar">
            <div className="phone-tab active">
              <I.Home size={14} />
              <span>Home</span>
            </div>
            <div className="phone-tab">
              <I.Receipt size={14} />
              <span>Orders</span>
            </div>
            <div className="phone-tab">
              <I.Heart size={14} />
              <span>Saved</span>
            </div>
            <div className="phone-tab">
              <I.Wallet size={14} />
              <span>Wallet</span>
            </div>
            <div className="phone-tab">
              <I.User size={14} />
              <span>Profile</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
