import { REVIEWS } from "@/lib/cases";
import { getResolvedSiteConfig } from "@/utils/siteConfig";

function Stars({ count }: { count: number }) {
  return <span className="text-orange text-sm">{"★".repeat(count)}</span>;
}

export default async function ReviewsSection() {
  const { tenantUi } = await getResolvedSiteConfig();
  const reviews = tenantUi?.reviews?.length ? tenantUi.reviews : REVIEWS;
  const satisfaction = tenantUi?.reviewsSatisfaction || "96%";

  return (
    <section id="reviews" className="py-16 lg:py-24 bg-gray-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-dark mb-3">
            실제 이용 고객 만족도{" "}
            <span className="text-orange">{satisfaction}</span>
          </h2>
          <p className="text-gray-600">폐업·철거를 경험하신 분들의 후기입니다</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <Stars count={review.rating} />
              <p className="text-gray-600 text-sm leading-relaxed mt-4 mb-4">
                &ldquo;{review.text}&rdquo;
              </p>
              <p className="text-sm font-bold text-dark">
                {review.name}{" "}
                <span className="text-gray-400 font-normal">| {review.business}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
