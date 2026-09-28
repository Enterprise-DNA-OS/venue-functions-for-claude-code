# Venue evidence checks

Checked 28 September 2026. These rules flag missing records for an operator to review. They do not inspect service on the night, test food, certify a licence, calculate legal occupancy, or replace the venue's food control plan. A cleared flag means the named evidence field is filled, not that the legal duty is met. No notifications are sent.

| Rule | Record check | Basis and scope |
| --- | --- | --- |
| ALLERGEN-INFO | Food item has not had allergen information verified | FSANZ explains that allergen information must be available for packaged and unpackaged food. Verification is this desk's evidence convention, not a statutory checkbox. |
| DIETARY-HANDOVER | Event dietary review is unconfirmed | Operator workflow supporting the FSANZ advice to communicate allergen information when a customer discloses an allergy. It also flags an event with no recorded requirements until a person reviews it. |
| NZ-HOST | NZ alcohol event lacks a host plan or confirmations for food/free water, low/no alcohol options or transport | Health New Zealand's sample host responsibility policy. These are prompts to review practical arrangements, not a complete statement of liquor law. |
| NZ-LICENCE-REVIEW | NZ alcohol event lacks licence evidence or responsible manager | Operator review prompt. Enter the actual licence conditions, permitted hours, manager evidence and any relevant exemptions. The tool does not decide whether a special licence is required. |
| AU-LICENCE-REVIEW | Australian alcohol event lacks licence evidence, responsible person or a host plan | Operator review prompt. Australian liquor conditions vary by state and territory. No NZ legal rule is applied to an Australian room. |
| CAPACITY | Guests exceed the configured room capacity | Venue policy only. Set capacity from the venue's applicable room configuration and fire/occupancy documentation. It is not a statutory default. |
| ROOM-REVIEW | Tentative or confirmed event has no room session | Without a room, the program cannot check jurisdiction or capacity. |

Sources:

- [FSANZ food service allergen information](https://www.foodstandards.gov.au/consumer/foodallergies/food-allergen-portal/Allergy-information-for-the-food-service-industry). Standards 1.2.1 and 1.2.3 are linked there. The system stores descriptions and verification evidence. It never declares a dish safe or allergen free.
- [Health New Zealand sample host responsibility policy](https://resources.alcohol.org.nz/assets/Licensed-premises-templates-and-forms/On-licensed-Premises-Toolkit_Sample-Host-Responsibility-Policy_AL1057iii.pdf). The sample covers food, water, drink alternatives and transport along with other responsibilities. Review the complete policy and actual licence before service.

Seven-day stale enquiries, final-number dates and deposit dates are business policies, not legal periods. Configure dates from the signed booking. Compliance findings cover tentative and confirmed events, including events left in those states after their date; mark completed events accurately. No statutory food-safety retention or payroll compliance engine is supplied.

Store dietary details only for the business purpose, restrict access and define a retention policy. Exported records and printed sheets need the same protection as the database. Audit history records changes but administrators can alter it; it is not tamper proof.
