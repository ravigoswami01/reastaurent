export const generateOrderEmailHTML = ({
  name,
  orderId,
  items,
  total,
  eta,
  orderDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  companyName = "Your Company",
  supportEmail = "support@company.com",
  trackingUrl = "#",
}) => {
  // Format items if it's an array
  const itemsList = Array.isArray(items)
    ? items
        .map(
          (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <div style="display: flex; align-items: center;">
            <div style = "gap: 12px; display: flex; align-items: center;">
              <div style="font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #666;">Qty: ${item.quantity}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 500; color: #1a1a1a;">
          ₹${item.price}
        </td>
      </tr>
    `,
        )
        .join("")
    : `<tr><td colspan="2" style="padding: 12px 0; color: #666;">${items}</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Email Content -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 60px; text-align: center; position: relative;">
              <div style="display: inline-block; background-color: #ffffff; width: 64px; height: 64px; border-radius: 50%; margin-bottom: 20px; line-height: 64px; font-size: 32px;">
                ✅
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Order Confirmed!
              </h1>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Thank you for your order, ${name}
              </p>
            </td>
          </tr>

          <!-- Order Info Card -->
          <tr>
            <td style="padding: 0 40px; transform: translateY(-30px);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <div style="font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Order ID</div>
                          <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; font-family: 'Courier New', monospace;">#${orderId}</div>
                        </td>
                        <td style="padding-bottom: 16px; text-align: right;">
                          <div style="font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Order Date</div>
                          <div style="font-size: 14px; font-weight: 500; color: #1a1a1a;">${orderDate}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ETA Banner -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 500; margin-bottom: 4px;">
                      Estimated Delivery Time
                    </div>
                    <div style="color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -1px;">
                      ${eta} <span style="font-size: 18px; font-weight: 500;">mins</span>
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.9); font-size: 13px; margin-top: 4px;">
                      We're preparing your order right now!
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                Order Details
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${itemsList}
                
                <!-- Total -->
                <tr>
                  <td colspan="2" style="padding-top: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 2px solid #e0e0e0;">
                      <tr>
                        <td style="padding: 16px 0 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                          Total
                        </td>
                        <td style="padding: 16px 0 0; font-size: 24px; font-weight: 700; color: #667eea; text-align: right;">
                          ₹${total}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                Track Your Order
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-bottom: 1px solid #e0e0e0;"></div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Need Help?
                    </h3>
                    <p style="margin: 0 0 16px; font-size: 14px; color: #666; line-height: 1.6;">
                      Our customer support team is here to help you with any questions.
                    </p>
                    <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none; font-weight: 500; font-size: 14px;">
                      ${supportEmail}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #1a1a1a; font-weight: 500;">
                ${companyName}
              </p>
              <p style="margin: 0 0 16px; font-size: 13px; color: #888; line-height: 1.6;">
                This email was sent to confirm your order.<br>
                Please do not reply to this email.
              </p>
              <div style="margin-top: 20px;">
                <a href="#" style="display: inline-block; margin: 0 8px; color: #888; text-decoration: none; font-size: 13px;">Privacy Policy</a>
                <span style="color: #ddd;">|</span>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #888; text-decoration: none; font-size: 13px;">Terms of Service</a>
              </div>
              <p style="margin: 16px 0 0; font-size: 12px; color: #aaa;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};
