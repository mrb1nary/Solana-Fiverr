import { BACKEND_URL } from '../utils/utils';
import axios from 'axios';
import { useEffect, useState } from 'react';

async function getTaskDetails(taskId: string) {
    const response = await axios.get(`${BACKEND_URL}/v1/user/task?taskId=${taskId}`, {
        headers: {
            "Authorization": localStorage.getItem("token")
        }
    })
    return response.data
}

interface PageProps {
    params: {
      taskId: string | undefined;
    };
  }

export const Page: React.FC<PageProps> = ({ params: { taskId } }) => {
  const [result, setResult] = useState<Record<string, {
    count: number;
    option: {
      imageUrl: string;
    };
  }>>({});
  const [taskDetails, setTaskDetails] = useState<{ title?: string }>({});

  useEffect(() => {
    getTaskDetails(taskId!)
      .then((data) => {
        setResult(data.result);
        setTaskDetails(data.taskDetails);
      });
  }, [taskId]);

  return (
    <div>
      <div className='text-2xl pt-20 flex justify-center text-white'>
        {taskDetails.title}
      </div>
      <div className='flex justify-center pt-8 text-white'>
        {Object.keys(result || {}).map(taskId => (
          <Task key={taskId} imageUrl={result[taskId].option.imageUrl} votes={result[taskId].count} />
        ))}
      </div>
    </div>
  );
};

function Task({imageUrl, votes}: {
    imageUrl: string;
    votes: number;
}) {
    return <div>
        <img className={"p-2 w-96 rounded-md"} src={imageUrl} />
        <div className='flex justify-center'>
            {votes}
        </div>
    </div>
}





