import { registerGame } from './registry';
import { MostLikelyFlow } from './mostlikely/Flow';

/**
 * თამაშის ეკრანების რეგისტრაცია.
 *
 * ერთი ადგილი, სადაც ყველა გადმოტანილი თამაში ირთვება. რაც აქ არაა,
 * მთავარ ეკრანზე ისევ ჩანს, მაგრამ გახსნისას „მალე“-ს აჩვენებს —
 * ანუ ნაწილობრივი პორტიც აპს არ ტეხს.
 */
registerGame('mostlikely', MostLikelyFlow);

export {};
