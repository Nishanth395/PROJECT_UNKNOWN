\# Project Unknown — Technical Architecture



\## 1. Project Overview



Project Unknown is an AI-powered hyperlocal skilled-services marketplace.



The core product flow is:



Customer describes a problem

→ AI understands the problem

→ System identifies required skills

→ Matching engine finds suitable nearby skilled workers

→ Customer requests a worker

→ Worker accepts

→ Service is completed

→ Customer reviews the service

→ Reputation data improves future matching



\---



\# 2. Architecture Principles



Project Unknown will follow these principles:



1\. Keep the architecture modular.

2\. Keep AI separate from business logic.

3\. Never allow unvalidated AI output to directly modify critical data.

4\. Keep customer and Kaarigar experiences distinct.

5\. Use PostgreSQL for relational marketplace data.

6\. Build the matching engine as a Project Unknown-owned service.

7\. Design privacy and security into the system from the beginning.

8\. Use external regulated providers for services that require specialized infrastructure.

9\. Build the MVP incrementally rather than creating unnecessary complexity.

10\. Prefer explainable decisions over black-box decisions wherever possible.



\---



\# 3. Applications



\## 3.1 Mobile Application



Technology:



\- React Native

\- Expo



The mobile application will support two roles:



\### Customer



Customer can:



\- Register/login

\- Provide location

\- Describe a problem

\- Upload a photo

\- Use voice input

\- View AI-understood job

\- View recommended Kaarigars

\- Request a Kaarigar

\- Track job status

\- Complete a job

\- Rate/review the Kaarigar



\### Kaarigar



Kaarigar can:



\- Register/login

\- Create a worker profile

\- Add skills

\- Add experience

\- Set availability

\- Receive job requests

\- Accept/reject requests

\- Update job status

\- Complete jobs

\- View ratings/reputation



\---



\# 4. Admin Application



Technology:



\- Next.js

\- React



The admin application will provide operational control over:



\- Customers

\- Kaarigars

\- Jobs

\- Requests

\- Skills/categories

\- Verification

\- Reviews

\- Complaints

\- Payments

\- Platform analytics



\---



\# 5. Backend



Technology:



\- Node.js

\- Express



The backend will provide the central API and business logic.



Major backend modules:



\- Authentication

\- Users

\- Customers

\- Kaarigars

\- Skills

\- Jobs

\- Requests

\- Matching

\- Reviews

\- Trust

\- Location

\- Availability

\- Pricing

\- Notifications

\- Payments

\- Complaints

\- Admin



\---



\# 6. Backend Architecture



The backend will follow:



Client

→ Route

→ Controller

→ Service

→ Database



Routes should not contain large amounts of business logic.



Business rules belong inside service modules.



Example:



POST /jobs

→ Job Controller

→ Job Service

→ Database



\---



\# 7. Database



Database:



\- PostgreSQL



ORM:



\- Prisma



Core entities:



\- User

\- Customer

\- Kaarigar

\- Skill

\- KaarigarSkill

\- Job

\- JobRequest

\- Match

\- Availability

\- Review

\- TrustScore

\- Location

\- PriceEstimate

\- Payment

\- Complaint

\- Notification



Core relationship:



Customer

→ Job

→ Match

→ Kaarigar

→ Job Completion

→ Review

→ Trust Score



\---



\# 8. Authentication



Authentication will initially use:



\- Phone number

\- OTP

\- Secure session/token mechanism



Customer and Kaarigar accounts will have role-based access.



Admin accounts will have stronger authentication requirements.



Secrets and credentials must never be committed to GitHub.



\---



\# 9. AI Architecture



AI will be implemented as a separate service layer.



The AI system will initially support:



\- Text understanding

\- Voice understanding

\- Image understanding



The AI's job is to understand the customer's problem and produce structured information.



AI must NOT directly perform database operations.



Pipeline:



Input

→ AI

→ Structured Output

→ Schema Validation

→ Business Validation

→ Matching Engine



\---



\# 10. Structured Job Representation



AI output should be converted into a predictable structure.



Example:



{

&#x20; "service": "plumbing",

&#x20; "problem": "tap leakage",

&#x20; "urgency": "medium",

&#x20; "required\_skills": \[

&#x20;   "tap repair",

&#x20;   "leakage repair"

&#x20; ],

&#x20; "confidence": 0.94

}



If confidence is too low, the system should ask the customer for clarification instead of making an unreliable recommendation.



\---



\# 11. Voice Architecture



Voice pipeline:



Voice

→ Speech-to-Text

→ Language Detection

→ Job Understanding

→ Structured Job



Initial supported languages:



\- English

\- Hindi

\- Marathi



Additional languages may be added later based on actual user demand.



\---



\# 12. Image Understanding



Image pipeline:



Photo

→ Vision Model

→ Problem Identification

→ Service Identification

→ Confidence

→ Structured Job



Example:



Photo of leaking pipe

→ Plumbing

→ Pipe leakage

→ Recommended skilled workers



Image interpretation is advisory and must be validated before being used for matching.



\---



\# 13. Matching Engine



The matching engine is owned by Project Unknown.



Initial factors:



\- Skill compatibility

\- Relevant experience

\- Distance

\- Availability

\- Reliability

\- Rating

\- Price fit



The engine will calculate a normalized recommendation score.



The initial weights are configurable and should be treated as starting assumptions.



Weights will be improved using real marketplace outcomes.



\---



\# 14. Trust Engine



Trust will be calculated from marketplace behavior.



Potential factors:



\- Completed jobs

\- Customer ratings

\- Repeat customers

\- Response rate

\- Cancellation rate

\- Verification status

\- Complaints



Trust Score should be explainable to users.



Example:



92/100



\- 127 completed jobs

\- 4.8 average rating

\- 96% response rate

\- Low cancellation rate

\- Identity verified



\---



\# 15. Job Lifecycle



The job state machine is:



REQUESTED

→ ACCEPTED

→ ON\_THE\_WAY

→ STARTED

→ COMPLETED



Possible cancellation:



REQUESTED

→ CANCELLED



ACCEPTED

→ CANCELLED



Job status changes must be validated by the backend.



\---



\# 16. Location



Location will be used for:



\- Nearby worker discovery

\- Distance calculation

\- Matching

\- Service-area filtering



The system should avoid unnecessary continuous location tracking.



Location should only be collected and processed when necessary for the product experience.



\---



\# 17. Notifications



Push notifications will initially use Firebase Cloud Messaging.



Potential notifications:



\- New job request

\- Request accepted

\- Worker on the way

\- Job started

\- Job completed

\- Review reminder



\---



\# 18. Payments



Project Unknown will use an appropriate regulated payment provider.



Project Unknown should not attempt to build its own payment-aggregation infrastructure for the MVP.



Payment architecture:



Customer

→ Payment Provider

→ Payment Confirmation

→ Project Unknown

→ Job/Settlement



The exact provider and payment flow will be finalized before commercial transactions are enabled.



\---



\# 19. Security



Security requirements include:



\- HTTPS

\- Authentication

\- Authorization

\- Input validation

\- Rate limiting

\- Secure file uploads

\- Secure secret management

\- Database access controls

\- Error handling

\- Logging

\- Role-based access control



Sensitive information must not be exposed through APIs unnecessarily.



\---



\# 20. Privacy



Potential personal data includes:



\- Name

\- Phone number

\- Location

\- Address

\- Voice/transcripts

\- Photos

\- Job history

\- Reviews

\- Verification information



The application must collect only information necessary for its intended purpose.



Production launch requires appropriate privacy notices, consent mechanisms and applicable data-protection compliance.



\---



\# 21. Compliance



Before commercial launch, Project Unknown must review applicable:



\- Company/business registration

\- Tax/GST requirements

\- Consumer protection requirements

\- E-commerce requirements

\- Data protection requirements

\- Worker agreements

\- Payment requirements

\- State/local requirements

\- Service-specific licensing or qualification requirements



Commercial launch should be reviewed with qualified legal and tax professionals.



\---



\# 22. External Services



Potential external services:



\- AI model provider

\- Speech-to-text provider

\- Maps/location provider

\- Firebase

\- Payment provider

\- OTP/SMS provider

\- Cloud hosting



External services should be isolated behind service modules wherever practical so they can be replaced later.



\---



\# 23. Development Strategy



Development order:



1\. Repository foundation

2\. Architecture

3\. Database

4\. Backend foundation

5\. Authentication

6\. Customer application

7\. Kaarigar application

8\. Job lifecycle

9\. AI job understanding

10\. Image understanding

11\. Voice

12\. Matching engine

13\. Trust engine

14\. Notifications

15\. Pricing

16\. Admin

17\. Security hardening

18\. Testing

19\. Payment integration

20\. Compliance readiness

21\. Real-world pilot



\---



\# 24. MVP Principle



The MVP must prove the core marketplace loop:



Customer problem

→ Correct understanding

→ Relevant Kaarigar

→ Successful request

→ Completed service

→ Customer feedback



Features that do not help prove this loop should not unnecessarily delay the MVP.



\---



\# 25. Long-Term Data Flywheel



Completed jobs generate useful marketplace data.



Job

→ Outcome

→ Review

→ Reputation

→ Better matching

→ Better outcomes

→ More trust

→ More jobs



The matching system can become increasingly data-driven as sufficient real-world data is collected.



\---



\# 26. Architecture Status



Version: 1.0



Status: Initial Architecture Lock



This document is the current technical architecture reference for Project Unknown.



Architecture changes should be documented rather than made informally.

