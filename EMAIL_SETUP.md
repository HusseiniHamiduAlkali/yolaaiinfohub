# Email Setup Instructions

## 1. Create a Project Email Account

It's recommended to create a dedicated Gmail account for the project:
1. Go to gmail.com and create a new account
2. Use a name like "Yola Info Hub" or similar
3. Suggested email: yola.info.hub@gmail.com

## 2. Enable 2-Step Verification

1. Go to your Google Account settings
2. Click on "Security"
3. Under "Signing in to Google", find "2-Step Verification"
4. Click "Get Started" and follow the steps

## 3. Generate App Password

1. Go back to Security settings
2. Under "2-Step Verification", find "App passwords"
3. Select "Mail" for the app
4. Select "Other" for device and name it "Yola Info Hub"
5. Click "Generate"
6. Copy the 16-character password

## 4. Configure .env File

1. Copy .env.example to .env
2. Update EMAIL_USER with your new project Gmail address
3. Update EMAIL_PASS with the 16-character app password
4. DO NOT use your regular Gmail password

## Important Notes

- The app password is different from your regular Gmail password
- Never commit the .env file to version control
- Keep the app password secure
- If compromised, you can revoke the app password in Google settings
