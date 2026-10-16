import {multiplayerConfigForProduct} from '../../../src/contracts/product-catalog.mts';
import type {UiMessageKey} from '../../../src/launcher/i18n.mts';
import type {RoomOwnerSnapshot, MultiplayerRoomService} from '../../services/multiplayer-room';
import {useLocale} from '../../i18n';
import {MainSelect} from '../launcher/MainSelect';

/** Field dependencies and wire indices belong to the product declaration. */
export function RoomLoadoutFields({state, service}: {state: RoomOwnerSnapshot; service: MultiplayerRoomService}) {
  const {t} = useLocale(), config = multiplayerConfigForProduct(state.product || '');
  const selected = config?.loadouts[state.preferredLoadout]?.selection;
  if (!config?.loadoutFields || !selected) return null;
  const disabled = !state.connected || !state.room?.synced || state.room.phase !== 'lobby' || state.launchBusy || state.loadoutPending;
  return <div className="mp-loadout-fields" hidden={state.spectatorRequested}>
    {config.loadoutFields.map((field, index) => {
      const choices = new Map<number, string>();
      for (const loadout of config.loadouts) {
        const values = loadout.selection;
        if (!values || field.dependsOn?.some(dependency => values[dependency]?.value !== selected[dependency]?.value)) continue;
        if (values[index]) choices.set(values[index]!.value, values[index]!.labelKey);
      }
      return <label key={index} className="mp-music-card" htmlFor={`mpLoadoutField${index}`}>
        <span>{t(field.labelKey as UiMessageKey)}</span>
        <MainSelect id={`mpLoadoutField${index}`} aria-label={t(field.labelKey as UiMessageKey)} className="option-select" value={selected[index]!.value} disabled={disabled}
          onChange={event => {
            const value = Number(event.currentTarget.value);
            const next = config.loadouts.findIndex(loadout => loadout.selection?.every((choice, dimension) => choice.value === (dimension === index ? value : selected[dimension]?.value)));
            if (next >= 0 && next !== state.preferredLoadout) service.changeLoadout(next - state.preferredLoadout);
          }}>
          {[...choices].map(([value, key]) => <option key={value} value={value}>{t(key as UiMessageKey)}</option>)}
        </MainSelect>
      </label>;
    })}
  </div>;
}
