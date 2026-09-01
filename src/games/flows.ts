import { registerGame } from './registry';
import { MostLikelyFlow } from './mostlikely/Flow';
import { NeverFlow } from './never/Flow';
import { PointOneFlow } from './pointone/Flow';
import { BombFlow } from './bomb/Flow';
import { ImpostorFlow } from './impostor/Flow';
import { SpyFlow } from './spy/Flow';
import { NoLaughFlow } from './nolaugh/Flow';
import { WordRushFlow } from './wordrush/Flow';
import { TruthDareFlow } from './truthdare/Flow';
import { DareCardFlow } from './darecard/Flow';
import { RuleCardFlow } from './rulecard/Flow';
import { WhoWroteFlow } from './whowrote/Flow';
import { TwoTruthsFlow } from './twotruths/Flow';
import { WavelengthFlow } from './wavelength/Flow';
import { TableReadFlow } from './tableread/Flow';

/**
 * თამაშის ეკრანების რეგისტრაცია.
 *
 * ერთი ადგილი, სადაც ყველა გადმოტანილი თამაში ირთვება. რაც აქ არაა,
 * მთავარ ეკრანზე ისევ ჩანს, მაგრამ გახსნისას „მალე“-ს აჩვენებს —
 * ანუ ნაწილობრივი პორტიც აპს არ ტეხს.
 */
registerGame('mostlikely', MostLikelyFlow);
registerGame('never', NeverFlow);
registerGame('pointone', PointOneFlow);
registerGame('bomb', BombFlow);
registerGame('impostor', ImpostorFlow);
registerGame('spy', SpyFlow);
registerGame('nolaugh', NoLaughFlow);
registerGame('wordrush', WordRushFlow);
registerGame('truthdare', TruthDareFlow);
registerGame('darecard', DareCardFlow);
registerGame('rulecard', RuleCardFlow);
registerGame('whowrote', WhoWroteFlow);
registerGame('twotruths', TwoTruthsFlow);
registerGame('wavelength', WavelengthFlow);
registerGame('tableread', TableReadFlow);

export {};
