/**
 * Schedule Page
 *
 * Schedule tweets and posts for publishing.
 */

import { Calendar } from 'lucide-react';

export default function SchedulePage() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Schedule your tweets and posts for optimal engagement
                </p>
            </div>

            {/* Empty State */}
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled posts</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Repurpose a blog into tweets and schedule them here
                </p>
            </div>
        </div>
    );
}
