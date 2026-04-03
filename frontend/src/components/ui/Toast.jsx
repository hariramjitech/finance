import toast from 'react-hot-toast';
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

const toastStyles = {
    success: {
        bg: 'bg-green-100 dark:bg-green-900',
        border: 'border-green-500 dark:border-green-700',
        text: 'text-green-900 dark:text-green-100',
        hover: 'hover:bg-green-200 dark:hover:bg-green-800',
        iconColor: 'text-green-600',
        Icon: CheckCircle,
        title: 'Success'
    },
    info: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        border: 'border-blue-500 dark:border-blue-700',
        text: 'text-blue-900 dark:text-blue-100',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-800',
        iconColor: 'text-blue-600',
        Icon: Info,
        title: 'Info'
    },
    warning: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        border: 'border-yellow-500 dark:border-yellow-700',
        text: 'text-yellow-900 dark:text-yellow-100',
        hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-800',
        iconColor: 'text-yellow-600',
        Icon: AlertTriangle,
        title: 'Warning'
    },
    error: {
        bg: 'bg-red-100 dark:bg-red-900',
        border: 'border-red-500 dark:border-red-700',
        text: 'text-red-900 dark:text-red-100',
        hover: 'hover:bg-red-200 dark:hover:bg-red-800',
        iconColor: 'text-red-600',
        Icon: XCircle,
        title: 'Error'
    }
};

const CustomToast = ({ type, message, t }) => {
    const style = toastStyles[type];
    const Icon = style.Icon;

    return (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
            max-w-md w-full pointer-events-auto flex ring-1 ring-black ring-opacity-5 
            ${style.bg} border-l-4 ${style.border} ${style.text} 
            p-4 rounded-lg shadow-lg flex items-center transition duration-300 ease-in-out 
            ${style.hover} transform hover:scale-105 cursor-pointer`}
            onClick={() => toast.dismiss(t.id)}
        >
            <div className="flex-shrink-0">
                <Icon className={`h-6 w-6 ${style.iconColor}`} />
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-semibold">
                    {style.title}
                </p>
                <p className="text-sm mt-1 opacity-90">
                    {message}
                </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => toast.dismiss(t.id)}
                >
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
};

const customToast = {
    success: (message) => toast.custom((t) => <CustomToast type="success" message={message} t={t} />),
    error: (message) => toast.custom((t) => <CustomToast type="error" message={message} t={t} />),
    info: (message) => toast.custom((t) => <CustomToast type="info" message={message} t={t} />),
    warning: (message) => toast.custom((t) => <CustomToast type="warning" message={message} t={t} />),
    loading: (message) => toast.loading(message, {
        style: {
            background: '#333',
            color: '#fff',
        }
    }),
    confirm: (message, onConfirm) => toast((t) => (
        <div className="flex flex-col gap-3 min-w-[300px]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <p className="font-bold text-gray-900">Confirmation</p>
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1.5 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        onConfirm();
                    }}
                    className="px-3 py-1.5 text-sm bg-rose-600 text-white font-medium hover:bg-rose-700 rounded-lg transition-colors shadow-sm"
                >
                    Confirm
                </button>
            </div>
        </div>
    ), {
        style: {
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            padding: '16px',
            border: '1px solid #f3f4f6'
        },
        duration: Infinity
    }),
    dismiss: toast.dismiss
};

export default customToast;
