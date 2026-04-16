import { useQuery } from "@tanstack/react-query";
import { getQuestionById } from "../services/questionApi";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Divider,
  Skeleton,
} from "@heroui/react";

interface QuestionPanelProps {
  /** Null while the matching service hasn't assigned a question yet. */
  questionId: string | null;
}

const difficultyColorMap: Record<
  string,
  "success" | "warning" | "danger" | "default"
> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

function QuestionSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <Skeleton className="h-5 w-2/3 rounded-lg" />
      <Skeleton className="h-3 w-1/3 rounded-lg" />
      <Divider className="my-1" />
      <Skeleton className="h-3 w-full rounded-lg" />
      <Skeleton className="h-3 w-full rounded-lg" />
      <Skeleton className="h-3 w-5/6 rounded-lg" />
      <Skeleton className="h-3 w-4/6 rounded-lg" />
      <Divider className="my-1" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export default function QuestionPanel({ questionId }: QuestionPanelProps) {
  const {
    data: question,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["question", questionId],
    queryFn: () => getQuestionById(questionId!),
    // Only fetch once the matching service has provided an ID
    enabled: !!questionId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return (
    <Card
      className="flex flex-col h-full rounded-none border-none shadow-none bg-content1"
      aria-label="Question panel"
    >
      {/* ── Header ── */}
      <CardHeader className="flex flex-col items-start gap-2 px-5 pt-5 pb-3 flex-none">
        {/* ── Waiting for match ── */}
      {!questionId && !isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/4 rounded-lg" />
        </div>
      )}

      {isLoading ? (
          <>
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/3 rounded-lg" />
          </>
        ) : isError ? null : (
          <>
            <h2 className="text-lg font-bold text-foreground leading-snug">
              {question?.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {question?.difficulty && (
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    difficultyColorMap[question.difficulty] ?? "default"
                  }
                  className="capitalize font-medium text-xs"
                >
                  {question.difficulty}
                </Chip>
              )}
              {question?.category && (
                <Chip
                  size="sm"
                  variant="bordered"
                  className="text-xs capitalize text-default-500"
                >
                  {question.category}
                </Chip>
              )}
              {question?.tags?.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  variant="flat"
                  className="text-xs capitalize text-default-500"
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </>
        )}
      </CardHeader>

      <Divider className="flex-none" />

      {/* ── Body ── */}
      <CardBody className="flex-1 overflow-y-auto px-5 py-4 gap-4">
        {/* No question assigned yet (matching service not yet called) */}
        {!questionId && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl opacity-30">🔍</span>
            <p className="text-sm font-semibold text-default-400">
              Awaiting question assignment
            </p>
            <p className="text-xs text-default-300">
              The matching service will provide a question when available.
            </p>
          </div>
        )}

        {isLoading && <QuestionSkeleton />}


        {isError && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm font-semibold text-danger">
              Failed to load question
            </p>
            <p className="text-xs text-default-400">
              {(error as Error)?.message ?? "Unknown error"}
            </p>
          </div>
        )}

        {!isLoading && !isError && question && (
          <>
            {/* Problem statement */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-default-700 leading-relaxed whitespace-pre-wrap">
                {question.question}
              </p>
            </div>

            {/* Examples */}
            {question.examples && question.examples.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-default-400">
                  Examples
                </h3>
                {question.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-default-100 border border-divider p-3 text-xs font-mono space-y-1"
                  >
                    <div>
                      <span className="font-semibold text-default-500">
                        Input:{" "}
                      </span>
                      <span className="text-foreground">{ex.input}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-default-500">
                        Output:{" "}
                      </span>
                      <span className="text-foreground">{ex.output}</span>
                    </div>
                    {ex.explanation && (
                      <div>
                        <span className="font-semibold text-default-500">
                          Explanation:{" "}
                        </span>
                        <span className="text-default-600">
                          {ex.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
