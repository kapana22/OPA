import { registerGame } from './registry';
import { MostLikelyFlow } from './mostlikely/Flow';
import { NeverFlow } from './never/Flow';
import { PointOneFlow } from './pointone/Flow';
import { BombFlow } from './bomb/Flow';

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

export {};
