# Campaign Manager

A comprehensive campaign management system with script injection capabilities for affiliate marketing tracking.

## Features

### 🎯 Campaign Management
- Create and manage multiple campaigns
- Template-based configuration (Myaffiliates template included)
- Cookie configuration with domain and expiry settings
- Referrer and cookie matching with regex patterns

### 📊 Script Injection
- Obfuscated JavaScript generation
- Automatic script URL generation
- Hidden logic implementation
- Cross-domain cookie setting

### 📈 Tracking & Analytics
- Real-time event tracking (cookie sets, registrations, FTDs)
- Conversion rate calculations
- Postback URL handling for casino integrations
- Comprehensive reporting dashboard

### 📋 Reporting Dashboard
- Daily and monthly report breakdowns
- Campaign performance overview
- Real-time statistics
- Interactive charts and graphs

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Helmet** for security
- **CORS** for cross-origin requests

### Frontend
- **React** with TypeScript
- **Material-UI** for components
- **Recharts** for data visualization
- **React Router** for navigation

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campaign-manager
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Configuration**
   
   Copy the environment files and configure them:
   ```bash
   cp env.example .env
   cp client/env.example client/.env
   ```

   Update the `.env` files with your configuration:
   ```env
   # Backend .env
   MONGODB_URI=mongodb://localhost:27017/campaign-manager
   PORT=5000
   NODE_ENV=development
   API_BASE_URL=http://localhost:5000
   JWT_SECRET=your-super-secret-jwt-key-here
   CORS_ORIGIN=http://localhost:3000
   ```

   ```env
   # Frontend client/.env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

5. **Start the application**
   
   For development:
   ```bash
   # Terminal 1 - Backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd client
   npm start
   ```

   For production:
   ```bash
   npm run build
   npm start
   ```

## Usage

### Creating a Campaign

1. Navigate to the "Campaigns" page
2. Click "New Campaign"
3. Fill in the basic information:
   - Campaign Name
   - Casino Name
   - Postback URL

4. Configure the Myaffiliates template:
   - **Cookie A & B Configuration:**
     - Cookie name and value
     - Domain (e.g., `.example.com`)
     - Expiry date
   
   - **Matching Rules:**
     - Referrer regex pattern
     - Cookie A regex pattern

5. Review and create the campaign

### Script Integration

1. After creating a campaign, copy the generated script URL
2. Add the script to your website:
   ```html
   <script src="https://your-server.example.com/api/scripts/[script-id].js"></script>
   ```

3. The script will automatically:
   - Check referrer patterns
   - Validate cookie conditions
   - Set tracking cookies
   - Send tracking events

### Postback Configuration

1. Use the provided postback URL for casino integration
2. The casino should send POST requests with:
   ```json
   {
     "eventType": "registration" | "ftd",
     "playerId": "player_123",
     "amount": 100,
     "currency": "USD",
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

### Monitoring & Reports

1. **Dashboard**: Overview of all campaigns and real-time stats
2. **Campaigns**: Manage individual campaigns and view script URLs
3. **Reports**: Detailed analytics with daily/monthly breakdowns

## API Endpoints

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Scripts
- `GET /api/scripts/:scriptId` - Serve obfuscated script
- `GET /api/scripts/:scriptId/info` - Get script information

### Postbacks
- `POST /api/postbacks/:campaignId` - Handle casino postbacks
- `GET /api/postbacks/:campaignId/url` - Get postback URL

### Reports
- `GET /api/reports/overview` - Get overview statistics
- `GET /api/reports/campaigns/:id` - Get campaign-specific report
- `GET /api/reports/realtime` - Get real-time statistics

### Events
- `POST /api/events/track` - Track events from injected scripts

## Security Features

- **Script Obfuscation**: All JavaScript logic is obfuscated
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: Built-in request rate limiting
- **Input Validation**: Comprehensive input validation
- **Helmet Security**: Security headers and protection

## Database Schema

### Campaigns Collection
```javascript
{
  name: String,
  casino: String,
  templateConfig: {
    templateType: String,
    cookieA: { name, value, domain, expiry },
    cookieB: { name, value, domain, expiry },
    referrerRegex: String,
    cookieARegex: String
  },
  postbackUrl: String,
  scriptUrl: String,
  isActive: Boolean,
  stats: { cookieSets, registrations, ftds }
}
```

### Events Collection
```javascript
{
  campaignId: ObjectId,
  eventType: String,
  userAgent: String,
  referrer: String,
  ipAddress: String,
  cookieData: Object,
  postbackData: Object,
  metadata: Object,
  createdAt: Date
}
```

## Deployment

### Using Docker (Recommended)

1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN cd client && npm install && npm run build
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t campaign-manager .
   docker run -p 5000:5000 campaign-manager
   ```

### Using PM2

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start the application:
   ```bash
   pm2 start server.js --name "campaign-manager"
   ```

### Environment Variables for Production

```env
MONGODB_URI=mongodb://your-mongodb-connection-string
PORT=5000
NODE_ENV=production
API_BASE_URL=https://your-domain.com
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository or contact the development team.
