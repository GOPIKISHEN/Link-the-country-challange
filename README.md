# Link-the-country-challange
A geo-quiz game where players connect two randomized countries by guessing the bordering path. Features a 3D interactive globe and deployed via AWS Free Tier.

🗺️ Country Link Challenge
A geographic pathfinding quiz game built for the web. The objective is to find a contiguous path of bordering countries between a randomly assigned Start Country and End Country before running out of 5 lives. The game provides a modern, interactive experience by visualizing the path in real-time on a 3D globe.

✨ Key Features
3D Interactive Globe: The game state (start, end, and current country) is visualized and updated in real-time using a Three.js-based library (globe.gl).

Border Validation: Utilizes the REST Countries API to fetch comprehensive country data and validate border connections against official ISO codes.

Lives System: Implements a state management system with a fixed number of 5 lives, adding challenge and re-playability.

⚙️ Technology StackCategoryTechnologyPurposeCore FrontendHTML5, CSS3, JavaScript (ES6+)Core Game Logic and UI Structure.3D Visualizationglobe.gl (built on Three.js)Rendering the interactive 3D Earth, highlighting countries, and drawing path arcs.Data SourceREST Countries APIFetching country names, border codes (CCA3), and geographic coordinates.DeploymentAWS S3 & AWS CloudFrontStatic website hosting and secure, fast content delivery (CDN) over HTTPS.

Real-time Path Visualization: The correct path entered by the user is drawn as arcs connecting the countries on the globe as the game progresses.

Cost-Effective Deployment: Hosted as a static website on AWS S3 and delivered globally via AWS CloudFront (leveraging the Free Tier).

🚀 Live Demo
See the game in action! Test your geography skills and observe the 3D globe updates.

➡️ http://world-game.s3-website-us-east-1.amazonaws.com/

✍️ Author
Gopikishen - linkedin@ www.linkedin.com/in/gopikishen-selvaraj-9b5873380
