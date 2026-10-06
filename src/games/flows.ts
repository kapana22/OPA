import { registerGame } from './registry';
import { MostLikelyFlow } from './mostlikely/Flow';
import { NeverFlow } from './never/Flow';
import { BombFlow } from './bomb/Flow';
import { ImpostorFlow } from './impostor/Flow';
import { SpyFlow } from './spy/Flow';
import { NoLaughFlow } from './nolaugh/Flow';
import { NoYesNoFlow } from './noyesno/Flow';
import { WordRushFlow } from './wordrush/Flow';
import { TruthDareFlow } from './truthdare/Flow';
import { DareCardFlow } from './darecard/Flow';
import { RuleCardFlow } from './rulecard/Flow';
import { WhoWroteFlow } from './whowrote/Flow';
import { TwoTruthsFlow } from './twotruths/Flow';
import { WavelengthFlow } from './wavelength/Flow';
import { HerdFlow } from './herd/Flow';
import { StandardsFlow } from './standards/Flow';
import { TenButFlow } from './tenbut/Flow';
import { CharadesFlow } from './charades/Flow';
import { WhoAmIFlow } from './whoami/Flow';
import { AliasFlow } from './alias/Flow';
import { MafiaFlow } from './mafia/Flow';

/**
 * თამაშის ეკრანების რეგისტრაცია.
 *
 * ერთი ადგილი, სადაც ყველა გადმოტანილი თამაში ირთვება. რაც აქ არაა,
 * მთავარ ეკრანზე ისევ ჩანს, მაგრამ გახსნისას „მალე“-ს აჩვენებს —
 * ანუ ნაწილობრივი პორტიც აპს არ ტეხს.
 */
registerGame('mostlikely', MostLikelyFlow);
registerGame('never', NeverFlow);
registerGame('bomb', BombFlow);
registerGame('impostor', ImpostorFlow);
registerGame('spy', SpyFlow);
registerGame('nolaugh', NoLaughFlow);
registerGame('noyesno', NoYesNoFlow);
registerGame('wordrush', WordRushFlow);
registerGame('truthdare', TruthDareFlow);
registerGame('darecard', DareCardFlow);
registerGame('rulecard', RuleCardFlow);
registerGame('whowrote', WhoWroteFlow);
registerGame('twotruths', TwoTruthsFlow);
registerGame('wavelength', WavelengthFlow);
registerGame('herd', HerdFlow);
registerGame('standards', StandardsFlow);
registerGame('tenbut', TenButFlow);
registerGame('charades', CharadesFlow);
registerGame('whoami', WhoAmIFlow);
registerGame('alias', AliasFlow);
registerGame('mafia', MafiaFlow);

// მინი-თამაშები — ოცივე ცალკე თამაშია საკუთარი ბარათით; ეკრანი საერთოა.

export {};
