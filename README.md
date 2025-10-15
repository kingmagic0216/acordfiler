# ACORD Intake Platform

A modern React application for streamlining insurance application processes with smart intake forms that auto-populate ACORD forms.

## Features

- **Customer Portal**: Multi-step intake form with business information, contact details, and coverage selection
- **Broker Console**: Submission management, COI generation, and ACORD forms library
- **Admin Dashboard**: User management, field mapping, branding, audit logs, and system settings
- **Modern UI**: Built with Tailwind CSS and Shadcn/ui components
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **React Router** for navigation
- **Lucide React** for icons
- **Radix UI** for accessible primitives

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd acord-intake-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   └── ui/           # Shadcn/ui components
├── pages/            # Main application pages
│   ├── Index.tsx     # Landing page
│   ├── CustomerIntake.tsx
│   ├── BrokerDashboard.tsx
│   └── AdminPanel.tsx
├── lib/
│   └── utils.ts      # Utility functions
├── App.tsx           # Main app component with routing
├── main.tsx          # Application entry point
└── index.css         # Global styles and CSS variables
```

## Pages

### Landing Page (`/`)
- Role selection (Customer, Broker, Admin)
- Platform overview and features
- Statistics and call-to-action sections

### Customer Portal (`/customer`)
- Multi-step intake form
- Business information collection
- Coverage type selection
- Document upload capability

### Broker Console (`/broker`)
- Submission management
- COI (Certificate of Insurance) generation
- ACORD forms library
- Client management

### Admin Dashboard (`/admin`)
- User management
- Field mapping configuration
- Branding customization
- Audit logs
- System settings

## Customization

### Branding
The platform supports custom branding through the admin panel:
- Company logo upload
- Color scheme customization
- Company name configuration

### Field Mapping
Configure how intake form fields map to ACORD form fields through the admin interface.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
