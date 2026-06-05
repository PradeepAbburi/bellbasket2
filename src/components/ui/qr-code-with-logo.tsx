import { QRCodeSVG } from 'qrcode.react';

interface QRCodeWithLogoProps {
    value: string;
    size?: number;
    logoSize?: number;
}

const QRCodeWithLogo = ({ value, size = 160, logoSize = 36 }: QRCodeWithLogoProps) => {
    return (
        <div className="relative w-[270px] h-[270px] flex items-center justify-center bg-transparent select-none shrink-0 p-8">
            
            {/* Top Border Line */}
            <div className="absolute top-0 left-4 right-4 flex items-center h-4">
                <div className="flex-1 border-t-2 border-dashed border-white" />
                <span className="px-2 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">BellBasket</span>
                <div className="flex-1 border-t-2 border-dashed border-white" />
            </div>

            {/* Bottom Border Line */}
            <div className="absolute bottom-0 left-4 right-4 flex items-center h-4">
                <div className="flex-1 border-t-2 border-dashed border-white" />
                <span className="px-2 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">BellBasket</span>
                <div className="flex-1 border-t-2 border-dashed border-white" />
            </div>

            {/* Left Border Line */}
            <div className="absolute left-0 top-4 bottom-4 flex flex-col items-center w-4">
                <div className="flex-1 border-l-2 border-dashed border-white" />
                <span className="py-2 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap [writing-mode:vertical-lr] rotate-180">
                    BellBasket
                </span>
                <div className="flex-1 border-l-2 border-dashed border-white" />
            </div>

            {/* Right Border Line */}
            <div className="absolute right-0 top-4 bottom-4 flex flex-col items-center w-4">
                <div className="flex-1 border-l-2 border-dashed border-white" />
                <span className="py-2 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap [writing-mode:vertical-lr]">
                    BellBasket
                </span>
                <div className="flex-1 border-l-2 border-dashed border-white" />
            </div>

            {/* Corner L-Shapes for dashed frames */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-dashed border-white" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-dashed border-white" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-dashed border-white" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-dashed border-white" />

            {/* Yellow Background & QR Wrapper */}
            <div className="bg-[#fef982] p-2.5 rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                <div className="bg-white p-2 rounded-xl flex items-center justify-center">
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
            </div>
        </div>
    );
};

export default QRCodeWithLogo;
