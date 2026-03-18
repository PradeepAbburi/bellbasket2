import { QRCodeSVG } from 'qrcode.react';

interface QRCodeWithLogoProps {
    value: string;
    size?: number;
    logoSize?: number;
}

const QRCodeWithLogo = ({ value, size = 200, logoSize = 40 }: QRCodeWithLogoProps) => {
    return (
        <div className="relative flex items-center justify-center bg-white p-2 rounded-2xl shadow-sm">
            <QRCodeSVG
                value={value}
                size={size}
                level="H" // High error correction to allow for the logo
                includeMargin={false}
                imageSettings={{
                    src: "/favicon.ico", // Using the app favicon as the logo
                    x: undefined,
                    y: undefined,
                    height: logoSize,
                    width: logoSize,
                    excavate: true, // This cuts out the QR modules behind the logo
                }}
            />
        </div>
    );
};

export default QRCodeWithLogo;
